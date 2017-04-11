const request = require("request")
const fs = require("fs")
const dots = require("dot").process({ path: "./views", templateSettings: { strip: false } })
const mkdirp = require('mkdirp')


function fetchData(levelId, cb) {
  let url = `http://elmaonline.net/API/times/${levelId}?bestall=all&noorder=0&timeformat=hs`
  request(url, (error, response, body) => {
    if (error) { cb(error) }
    cb(null, body)
  })
}

function timeConversion(millisec) {
  let date = new Date(millisec)
  return `${date.getUTCDate()-1} days, ${date.getUTCHours()} hrs, ${date.getUTCMinutes()} mins, ${date.getUTCSeconds()} secs`
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

  data.forEach(entry => {
    // check if before deadline
    if (entry.datetime.getTime() < deadline.getTime()) {
      if (leaders.length > 0) {
        if (parseInt(entry.time) < parseInt(leaders[leaders.length-1].time)) { // better than last leading time
          if (durations[entry.kuski] === undefined) durations[entry.kuski] = 0
          durations[leaders[leaders.length-1].name] += Math.abs(leaders[leaders.length-1].date - entry.datetime)
          leaders.push({ name: entry.kuski, time: parseInt(entry.time), date: entry.datetime })
        }
      } else { // first time
        leaders.push({ name: entry.kuski, time: parseInt(entry.time), date: entry.datetime })
        durations[entry.kuski] = 0
      }
    }
  })

  // finally add remaining time up to deadline to leader
  durations[leaders[leaders.length-1].name] += Math.abs(leaders[leaders.length-1].date - deadline)

  return { leaders: leaders, durations: durations }
}

function produceChart(data, startDate, endDate, options) {
  let startFormatted = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(),
    startDate.getUTCHours(), startDate.getUTCMinutes())
  let endFormatted = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(),
    endDate.getUTCHours(), endDate.getUTCMinutes())
  let { leaders, durations } = calculateStats(data, endDate)

  let chart = {
    chart: {
      type: 'line'
    },
    // data: { dateFormat: 'YYYY-mm-dd' },
    title: {
      text: options.title || ''
    },
    series: [{
      data: []
    }],
    xAxis: {
      type: 'datetime',
      tickInterval: 3600 * 1000 * 6,
      min: startFormatted,
      max: endFormatted,
    }
  }

  leaders.forEach(entry => {
    let dateFormatted = Date.UTC(entry.date.getUTCFullYear(), entry.date.getUTCMonth(), entry.date.getUTCDate(),
      entry.date.getUTCHours(), entry.date.getUTCMinutes())
    chart.series[0].data.push([dateFormatted, entry.time])
  })

  return chart
}

// wc701
let startDate = new Date('2017-02-19 19:00')
let endDate = new Date('2017-02-26 17:00')
let levelId = 371127
let data = Object.values(JSON.parse(fs.readFileSync('wc701_data.json', 'utf8')))

let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
writeHTML({ chart: JSON.stringify(chartData, null, 2) })
