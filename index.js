const request = require("request")
const fs = require("fs")
const dots = require("dot").process({ path: "./views" })
const mkdirp = require('mkdirp')


// wc701: 371127
function fetchData(levelId, cb) {
  let url = `http://elmaonline.net/API/times/${levelId}?bestall=all&noorder=0&timeformat=hs`
  request(url, (error, response, body) => {
    if (error) { cb(error) }
    cb(null, body)
  })
}

function timeConversion(millisec) {
  let date = new Date(millisec)
  var str = ''
  str += date.getUTCDate()-1 + " days, "
  str += date.getUTCHours() + " hours, "
  str += date.getUTCMinutes() + " minutes, "
  str += date.getUTCSeconds() + " seconds"
  return str
}

function writeHTML() {
  // let test = dots.index({ json: JSON.stringify(leaders) })
  mkdirp('./dist', err => {
      if (err) console.error(err)
      fs.writeFileSync('./dist/index.html', test)
  })
}


let data = Object.values(JSON.parse(fs.readFileSync('wc701_data.json', 'utf8')))

data.forEach(val => {
  val.datetime = new Date(val.datetime)
  val.datetime.setHours(val.datetime.getHours() + 7)
})

data.sort((a, b) => {
  return a.datetime - b.datetime
})

let deadline = new Date('2017-02-26 17:00')
let leaders = []
let duration = {}

data.forEach(entry => {
  // check if before deadline
  if (entry.datetime.getTime() < deadline.getTime()) {
    if (leaders.length > 0) {
      if (parseInt(entry.time) < parseInt(leaders[leaders.length-1].time)) { // better than last leading time
        if (duration[entry.kuski] === undefined) duration[entry.kuski] = 0
        duration[leaders[leaders.length-1].name] += Math.abs(leaders[leaders.length-1].date - entry.datetime)
        leaders.push({ name: entry.kuski, time: parseInt(entry.time), date: entry.datetime })
      }
    } else { // first time
      leaders.push({ name: entry.kuski, time: parseInt(entry.time), date: entry.datetime })
      duration[entry.kuski] = 0
    }
  }
})

// finally add remaining time up to deadline to leader
duration[leaders[leaders.length-1].name] += Math.abs(leaders[leaders.length-1].date - deadline)

console.log(timeConversion(duration['Kazan']))
