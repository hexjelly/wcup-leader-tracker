const request = require("request")
const fs = require("fs")
const dots = require("dot").process({ path: "./views", templateSettings: { strip: false } })
const mkdirp = require('mkdirp')


function fetchData(levelId) {
  let url = `http://elmaonline.net/API/times/${levelId}?bestall=all&noorder=0&timeformat=hs`
  return new Promise((resolve, reject) => {
    request(url, (error, response, body) => {
      if (error) return reject(error)
      return resolve(Object.values(JSON.parse(body)))
    })
  })
}

function leading0(number) { return number < 10 ? "0" : "" }

function hsToFormatted(hs) {
  let mins = parseInt((hs / 100) / 60)
  let secs = parseInt((hs / 100) % 60)
  let huns = parseInt(hs % 100)
  return leading0(mins) + mins + ":" + leading0(secs) + secs + "," + leading0(huns) + huns
}

function writeHTML(data) {
  data = dots.index(data, { strip: false })
  mkdirp('./dist', err => {
      if (err) console.error(err)
      fs.writeFileSync('./dist/index.html', data)
  })
}

function calculateStats(data, deadline) {
  // convert string dates to Date objects, make up for -7hr timezone difference to UTC (?)
  // might need to edit this to take into consideration something, not sure yet
  data.forEach(val => {
    val.datetime = new Date(val.datetime)
    val.datetime.setHours(val.datetime.getHours() + 7)
  })

  data.sort((a, b) => {
    return a.datetime - b.datetime
  })

  let leaders = []
  let durations = {}
  let times = {}

  data.forEach(entry => {
    let lead = false

    // check if before deadline
    if (entry.datetime.getTime() < deadline.getTime()) {
      // leader checks
      if (leaders.length > 0) {
        if (parseInt(entry.time) < parseInt(leaders[leaders.length-1].time)) { // better than last leading time
          lead = true
          if (durations[entry.kuski] === undefined) durations[entry.kuski] = 0
          durations[leaders[leaders.length-1].name] += Math.abs(leaders[leaders.length-1].date - entry.datetime)
          leaders.push({ name: entry.kuski, time: parseInt(entry.time), date: entry.datetime })
        }
      } else { // first time
        leaders.push({ name: entry.kuski, time: parseInt(entry.time), date: entry.datetime })
        durations[entry.kuski] = 0
      }

      // add new nick to times list if not exist
      if (!times[entry.kuski]) {
        times[entry.kuski] = [{ time: parseInt(entry.time), date: entry.datetime, leader: lead }]

      } else if (parseInt(entry.time) < times[entry.kuski][times[entry.kuski].length - 1].time) { // if nick exist, check if time better
        times[entry.kuski].push({ time: parseInt(entry.time), date: entry.datetime, leader: lead })
      }
    }
  })

  // finally add remaining time up to deadline to leader
  durations[leaders[leaders.length-1].name] += Math.abs(leaders[leaders.length-1].date - deadline)

  // order durations
  const orderedDurations = {}
  Object.keys(durations).sort((a, b) => {
    return durations[b] - durations[a]
  }).forEach(key => {
    let date = new Date(durations[key])
    orderedDurations[key] = {
      ms: durations[key],
      days: date.getUTCDate()-1,
      hours: date.getUTCHours(),
      mins: date.getUTCMinutes(),
      secs: date.getUTCSeconds()
    }
  })

  // order times by nick for chart
  const orderedTimes = {}
  Object.keys(times).sort((a, b) => {
    return a.toLowerCase().localeCompare(b.toLowerCase())
  }).forEach(key => {
    orderedTimes[key] = times[key]
  })

  return { leaders: leaders, durations: orderedDurations, times: orderedTimes }
}

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF
    colour += ('00' + value.toString(16)).substr(-2)
  }
  return colour
}

function produceRegularChart(data, startDate, endDate) {
  let startFormatted = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(),
    startDate.getUTCHours()-1, startDate.getUTCMinutes())
  let endFormatted = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(),
    endDate.getUTCHours()+1, endDate.getUTCMinutes())
  let { leaders, durations, times } = data

  let chartData = { series: [], startFormatted: startFormatted, endFormatted: endFormatted, winTime: leaders[leaders.length-1].time }

  for (name in times) {
    let data = []
    times[name].forEach(time => {
      let dateFormatted = Date.UTC(time.date.getUTCFullYear(), time.date.getUTCMonth(), time.date.getUTCDate(),
        time.date.getUTCHours(), time.date.getUTCMinutes())
      if (time.leader) {
        data.push({ y: time.time, x: dateFormatted, formatted: hsToFormatted(time.time), dataLabels: {
          format: `${hsToFormatted(time.time)}`, style: { color: '#ab2020', fontSize: '13px' }, zIndex: 10, allowOverlap: true }
        })
      } else {
        data.push({ y: time.time, x: dateFormatted, formatted: hsToFormatted(time.time) })
      }
    })
    // pad to past end date
    data.push({ y: data[data.length-1].y, x: endFormatted + 86400000, formatted: hsToFormatted(data[data.length-1].y) })

    chartData.series.push({ name: name, data: data, visible: durations[name] !== undefined, step: 'left', marker: { enabled: true }, color: hashColor(name) })
  }

  return chartData
}

function createHTML(events) {
  let eh = events.map(event => {
    return fetchData(event.levelId).then(result => {
      let { leaders, durations, times } = calculateStats(result, event.endDate)
      let chartData = produceRegularChart({ leaders, durations, times }, event.startDate, event.endDate)
      return {
        title: event.title || '',
        startFormatted: JSON.stringify(chartData.startFormatted, null, 2),
        endFormatted: JSON.stringify(chartData.endFormatted, null, 2),
        winTime: JSON.stringify(chartData.winTime, null, 2),
        series: JSON.stringify(chartData.series, null, 2),
        durations: durations
      }
    })
  })

  Promise.all(eh).then(result => {
    writeHTML(result)
  }).catch(e => { console.log(e) })
}




let events = [
  { title: "WCup701", startDate: new Date('2017-02-19 19:00'), endDate: new Date('2017-02-26 17:00'), levelId: 371127 },
  { title: "WCup702", startDate: new Date('2017-02-26 17:00'), endDate: new Date('2017-03-05 17:00'), levelId: 371726 },
  { title: "WCup703", startDate: new Date('2017-03-05 17:00'), endDate: new Date('2017-03-12 18:00'), levelId: 372197 },
  { title: "WCup704", startDate: new Date('2017-03-12 18:00'), endDate: new Date('2017-03-19 18:00'), levelId: 372760 },
  { title: "WCup706", startDate: new Date('2017-03-26 17:00'), endDate: new Date('2017-04-02 17:00'), levelId: 374120 },
  { title: "WCup707", startDate: new Date('2017-04-02 17:00'), endDate: new Date('2017-04-09 17:00'), levelId: 374907 },
  { title: "WCup708", startDate: new Date('2017-04-09 17:00'), endDate: new Date('2017-04-16 17:00'), levelId: 376243 },
]

createHTML(events)
