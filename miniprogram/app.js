const env = require('./env.js')
const store = require('./utils/store.js')

App({
  onLaunch() {
    store.initCloud(env.cloudEnvId)
    if (!wx.getStorageSync('qingyue_ledger_entries')) {
      wx.setStorageSync('qingyue_ledger_entries', [])
    }
    store.syncFromCloud()
  },
  globalData: {
    cloudEnabled: false
  }
})
