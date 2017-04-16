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
  let leadersDict = []
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

function produceChart(data, startDate, endDate, options) {
  let startFormatted = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(),
    startDate.getUTCHours()-1, startDate.getUTCMinutes())
  let endFormatted = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(),
    endDate.getUTCHours(), endDate.getUTCMinutes())
  let { leaders, durations } = calculateStats(data, endDate)

  let chart = {
    chart: {
        plotBackgroundColor: null,
        plotBorderWidth: null,
        plotShadow: false,
        type: 'pie'
    },
    tooltip: {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
        pie: {
            allowPointSelect: true,
            cursor: 'pointer',
            dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.string}',
                connectorColor: 'silver'
            }
        }
    },
    series: [{
        data: []
    }]
  }

  for (entry in durations) {
    chart.series[0].data.push({ name: entry, y: durations[entry], string: timeConversion(durations[entry]) })
  }

  return chart
}

// wc701
// let startDate = new Date('2017-02-19 19:00')
// let endDate = new Date('2017-02-26 17:00')
// let levelId = 371127
// fetchData(levelId, (err, data) => {
//   data = Object.values(JSON.parse(data))
//   let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
//   writeHTML({ chart: JSON.stringify(chartData, null, 2) })
// })

// wc702
let startDate = new Date('2017-02-26 17:00')
let endDate = new Date('2017-03-05 17:00')
let levelId = 371726
fetchData(levelId, (err, data) => {
  data = Object.values(JSON.parse(data))
  let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
  writeHTML({ chart: JSON.stringify(chartData, null, 2) })
})

// wc703
// let startDate = new Date('2017-03-05 17:00')
// let endDate = new Date('2017-03-12 18:00')
// let levelId = 372197
// fetchData(levelId, (err, data) => {
//   data = Object.values(JSON.parse(data))
//   let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
//   writeHTML({ chart: JSON.stringify(chartData, null, 2) })
// })

// wc704
// let startDate = new Date('2017-03-12 18:00')
// let endDate = new Date('2017-03-19 18:00')
// let levelId = 372760
// fetchData(levelId, (err, data) => {
//   data = Object.values(JSON.parse(data))
//   let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
//   writeHTML({ chart: JSON.stringify(chartData, null, 2) })
// })

// wc706
// let startDate = new Date('2017-03-26 17:00')
// let endDate = new Date('2017-04-02 17:00')
// let levelId = 374120
// fetchData(levelId, (err, data) => {
//   data = Object.values(JSON.parse(data))
//   let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
//   writeHTML({ chart: JSON.stringify(chartData, null, 2) })
// })

// wc707
// let startDate = new Date('2017-04-02 17:00')
// let endDate = new Date('2017-04-09 17:00')
// let levelId = 374907
// fetchData(levelId, (err, data) => {
//   data = Object.values(JSON.parse(data))
//   let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
//   writeHTML({ chart: JSON.stringify(chartData, null, 2) })
// })

// wc708
// let startDate = new Date('2017-04-09 17:00')
// let endDate = new Date('2017-04-16 17:00')
// let levelId = 376243
// fetchData(levelId, (err, data) => {
//   data = Object.values(JSON.parse(data))
//   let chartData = produceChart(data, startDate, endDate, { title: '', levelId: levelId })
//   writeHTML({ chart: JSON.stringify(chartData, null, 2) })
// })
