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
data.forEach(time => {
  // before deadline
  if (time.datetime.getTime() < deadline.getTime()) {
    if (leaders.length > 0) {
      // is this better than last leading time?
      if (parseInt(time.time) < parseInt(leaders[leaders.length-1].time)) {
        leaders.push({ name: time.kuski, time: parseInt(time.time), date: time.datetime })
      }
    } else { // empty
      leaders.push({ name: time.kuski, time: parseInt(time.time), date: time.datetime })
    }
  }
})

// write file from template
let test = dots.index({ json: JSON.stringify(leaders) });

mkdirp('./dist', err => {
    if (err) console.error(err)
    fs.writeFileSync('./dist/index.html', test)
})
