const ctx = require("canvas")
const request = require("request")
const fs = require("fs")

// let levelId = 371127
// let url = `http://elmaonline.net/API/times/${levelId}?bestall=all&noorder=0&timeformat=hs`

// request(url, (error, response, body) => {
//   console.log(body)
// })

let data = JSON.parse(fs.readFileSync('wc701_data.json', 'utf8'))
Object.entries(data).forEach(([key, value]) => {
  console.log(key, value)
})
