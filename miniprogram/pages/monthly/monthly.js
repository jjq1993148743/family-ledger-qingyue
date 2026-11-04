const store = require('../../utils/store.js')

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function percent(part, total) {
  if (!total) return 0
  const v = Math.round(part / total * 100)
  return v < 4 ? 4 : v
}

Page({
  data: {
    year: 0,
    monthNum: 0,
    month: '',
    summary: { income: '0.00', expense: '0.00', balance: '0.00' },
    cats: [],
    members: [],
    count: 0
  },

  onLoad: function () {
    const now = new Date()
    this.setData({ year: now.getFullYear(), monthNum: now.getMonth() + 1 })
    this.build()
  },

  onShow: function () {
    if (this.data.month) this.build()
  },

  build: function () {
    const key = this.data.year + '-' + pad(this.data.monthNum)
    const items = store.list().filter(function (item) {
      return item.month === key
    })
    const expenseItems = items.filter(function (item) {
      return item.type !== 'income'
    })
    let total = 0
    const catMap = {}
    const memberMap = {}

    for (let i = 0; i < expenseItems.length; i++) {
      const it = expenseItems[i]
      const v = Number(it.amount) || 0
      total += v
      catMap[it.catLabel] = (catMap[it.catLabel] || 0) + v
      memberMap[it.member] = (memberMap[it.member] || 0) + v
    }

    const cats = Object.keys(catMap).map(function (k) {
      return {
        label: k,
        value: store.money(catMap[k]),
        width: percent(catMap[k], total)
      }
    }).sort(function (a, b) {
      return Number(b.value) - Number(a.value)
    })

    const members = Object.keys(memberMap).map(function (k) {
      return {
        label: k,
        value: store.money(memberMap[k]),
        width: percent(memberMap[k], total)
      }
    }).sort(function (a, b) {
      return Number(b.value) - Number(a.value)
    })

    this.setData({
      month: key,
      summary: store.summary(items),
      cats: cats,
      members: members,
      count: items.length
    })
  },

  prevMonth: function () {
    this.move(-1)
  },

  nextMonth: function () {
    this.move(1)
  },

  move: function (delta) {
    let y = this.data.year
    let m = this.data.monthNum + delta
    if (m < 1) {
      m = 12
      y = y - 1
    }
    if (m > 12) {
      m = 1
      y = y + 1
    }
    this.setData({ year: y, monthNum: m })
    this.build()
  }
})
