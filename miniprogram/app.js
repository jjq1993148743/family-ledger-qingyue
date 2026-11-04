App({
  onLaunch() {
    if (!wx.getStorageSync('qingyue_ledger_entries')) {
      wx.setStorageSync('qingyue_ledger_entries', [])
    }
  },
  globalData: {}
})
