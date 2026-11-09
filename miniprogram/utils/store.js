const KEY = 'qingyue_ledger_entries'
const PENDING_DEL = 'qingyue_pending_deletes'
const COLLECTION = 'familyledger_entries'
const PAGE_SIZE = 20
const MAX_PAGES = 50

let cloudReady = false
let syncing = null

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

function saveLocal(all) {
  wx.setStorageSync(KEY, all)
}

function initCloud(envId) {
  if (!envId || !wx.cloud) {
    cloudReady = false
    return false
  }
  try {
    wx.cloud.init({ env: envId, traceUser: true })
    cloudReady = true
  } catch (e) {
    console.warn('云开发初始化失败，退回本地模式', e)
    cloudReady = false
  }
  return cloudReady
}

function isCloudReady() {
  return cloudReady
}

function db() {
  return wx.cloud.database()
}

function pushToCloud(entry) {
  if (!cloudReady) return Promise.resolve()
  const data = Object.assign({}, entry)
  delete data._id
  delete data._openid
  return db()
    .collection(COLLECTION)
    .add({ data: data })
    .then(function (res) {
      const all = list()
      for (let i = 0; i < all.length; i++) {
        if (all[i].id === entry.id) {
          all[i]._id = res._id
          break
        }
      }
      saveLocal(all)
    })
    .catch(function (err) {
      console.warn('云端写入失败，已存本地，稍后再试', err)
    })
}

function deleteFromCloud(docId) {
  if (!cloudReady || !docId) return Promise.resolve()
  return db()
    .collection(COLLECTION)
    .doc(docId)
    .remove()
    .catch(function (err) {
      console.warn('云端删除失败，记入待重试队列', err)
      const queue = wx.getStorageSync(PENDING_DEL) || []
      if (queue.indexOf(docId) < 0) queue.push(docId)
      wx.setStorageSync(PENDING_DEL, queue)
    })
}

function flushPendingDeletes() {
  if (!cloudReady) return Promise.resolve()
  const queue = wx.getStorageSync(PENDING_DEL) || []
  if (!queue.length) return Promise.resolve()
  const jobs = queue.map(function (docId) {
    return db().collection(COLLECTION).doc(docId).remove()
  })
  return Promise.all(jobs)
    .then(function () {
      wx.setStorageSync(PENDING_DEL, [])
    })
    .catch(function () {})
}

function fetchPage(skip) {
  return db()
    .collection(COLLECTION)
    .orderBy('createdAt', 'desc')
    .skip(skip)
    .limit(PAGE_SIZE)
    .get()
    .then(function (res) {
      return res.data || []
    })
}

function fetchAllFromCloud() {
  let all = []
  let page = 0
  function next() {
    if (page >= MAX_PAGES) return Promise.resolve(all)
    return fetchPage(page * PAGE_SIZE).then(function (rows) {
      all = all.concat(rows)
      page++
      if (rows.length < PAGE_SIZE) return all
      return next()
    })
  }
  return next()
}

function mergeRemote(local, remote) {
  const seen = {}
  const merged = []
  for (let i = 0; i < local.length; i++) {
    seen[local[i].id] = true
    merged.push(local[i])
  }
  for (let j = 0; j < remote.length; j++) {
    if (!seen[remote[j].id]) merged.push(remote[j])
  }
  merged.sort(function (a, b) {
    return (b.createdAt || 0) - (a.createdAt || 0)
  })
  return merged
}

function uploadLocalAll(snapshot) {
  const jobs = snapshot.map(function (item) {
    return pushToCloud(item)
  })
  return Promise.all(jobs)
}

function syncFromCloud() {
  if (!cloudReady) return Promise.resolve({ ok: false, reason: 'cloud-off' })
  if (syncing) return syncing

  const local = list()
  const hasCloudId = local.some(function (item) {
    return !!item._id
  })
  const fullMode = local.length === 0 || !hasCloudId

  syncing = flushPendingDeletes()
    .then(function () {
      return fullMode ? fetchAllFromCloud() : fetchPage(0)
    })
    .then(function (rows) {
      if (fullMode) {
        if (!rows.length && local.length) {
          return uploadLocalAll(local.slice()).then(function () {
            return { ok: true, uploaded: local.length }
          })
        }
        saveLocal(mergeRemote(local, rows))
        return { ok: true, pulled: rows.length }
      }
      const maxCreatedAt = local.reduce(function (max, item) {
        return Math.max(max, item.createdAt || 0)
      }, 0)
      const fresh = rows.filter(function (item) {
        return (item.createdAt || 0) > maxCreatedAt
      })
      if (fresh.length) saveLocal(mergeRemote(local, fresh))
      return { ok: true, pulled: fresh.length }
    })
    .catch(function (err) {
      console.warn('云同步失败', err)
      return { ok: false, reason: (err && err.errMsg) || 'sync-error' }
    })
    .then(function (result) {
      syncing = null
      return result
    })

  return syncing
}

function add(entry) {
  const all = list()
  all.unshift(entry)
  saveLocal(all)
  pushToCloud(entry)
  return all
}

function remove(id) {
  const all = list()
  let docId = ''
  const next = []
  for (let i = 0; i < all.length; i++) {
    if (all[i].id === id) {
      docId = all[i]._id || ''
    } else {
      next.push(all[i])
    }
  }
  saveLocal(next)
  if (docId) deleteFromCloud(docId)
  return next
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
  summary: summary,
  initCloud: initCloud,
  isCloudReady: isCloudReady,
  syncFromCloud: syncFromCloud
}
