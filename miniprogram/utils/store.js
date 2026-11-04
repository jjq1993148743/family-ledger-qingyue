const KEY = 'qingyue_ledger_entries'

function pad(n) {
  return n < 10 ? '0' + n : String(n)
}

function dateKey(d) {
  const date = d || new Date()
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

function monthKey(d) {
  const date = d || new Date()
  return date.getFullYear() + '-' + pad(date.getMonth() + 1)
}

function money(n) {
  const v = Number(n) || 0
  return v.toFixed(2)
}

function list() {
  const data = wx.getStorageSync(KEY)
  return Array.isArray(data) ? data : []
}

function add(entry) {
  const all = list()
  all.unshift(entry)
  wx.setStorageSync(KEY, all)
  return all
}

function remove(id) {
  const all = list().filter(function (item) {
    return item.id !== id
  })
  wx.setStorageSync(KEY, all)
  return all
}

function summary(entries) {
  let income = 0
  let expense = 0
  for (let i = 0; i < entries.length; i++) {
    const amount = Number(entries[i].amount) || 0
    if (entries[i].type === 'income') {
      income += amount
    } else {
      expense += amount
    }
  }
  return {
    income: money(income),
    expense: money(expense),
    balance: money(income - expense)
  }
}

module.exports = {
  dateKey: dateKey,
  monthKey: monthKey,
  money: money,
  list: list,
  add: add,
  remove: remove,
  summary: summary
}
