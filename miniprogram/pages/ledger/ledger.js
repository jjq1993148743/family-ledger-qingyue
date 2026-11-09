const store = require('../../utils/store.js')

const EXPENSE_CATS = [
  { key: 'food', label: '伙食' },
  { key: 'daily', label: '日用' },
  { key: 'home', label: '居家' },
  { key: 'health', label: '医疗' },
  { key: 'edu', label: '教育' },
  { key: 'trip', label: '出行' },
  { key: 'other', label: '其他' }
]

const INCOME_CATS = [
  { key: 'salary', label: '工资' },
  { key: 'bonus', label: '奖金' },
  { key: 'side', label: '副业' },
  { key: 'invest', label: '理财' },
  { key: 'other', label: '其他' }
]

const MEMBERS = ['我', '家人', '共同']

function labelOf(cats, key) {
  for (let i = 0; i < cats.length; i++) {
    if (cats[i].key === key) return cats[i].label
  }
  return '其他'
}

Page({
  data: {
    month: '',
    type: 'expense',
    categories: EXPENSE_CATS,
    category: 'food',
    members: MEMBERS,
    member: '共同',
    amount: '',
    note: '',
    summary: { income: '0.00', expense: '0.00', balance: '0.00' },
    recent: [],
    total: 0
  },

  onLoad: function () {
    this.setData({ month: store.monthKey() })
  },

  onShow: function () {
    const self = this
    this.reload()
    store.syncFromCloud().then(function () {
      self.reload()
    })
  },

  reload: function () {
    const month = store.monthKey()
    const all = store.list()
    const current = all.filter(function (item) {
      return item.month === month
    })
    const recent = all.slice(0, 8).map(function (item) {
      return Object.assign({}, item, {
        amountText: store.money(item.amount),
        sign: item.type === 'income' ? '+' : '-'
      })
    })
    this.setData({
      month: month,
      summary: store.summary(current),
      recent: recent,
      total: all.length
    })
  },

  switchType: function (e) {
    const type = e.currentTarget.dataset.type
    const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS
    this.setData({ type: type, categories: cats, category: cats[0].key })
  },

  chooseCategory: function (e) {
    this.setData({ category: e.currentTarget.dataset.key })
  },

  chooseMember: function (e) {
    this.setData({ member: e.currentTarget.dataset.name })
  },

  onAmountInput: function (e) {
    this.setData({ amount: e.detail.value })
  },

  onNoteInput: function (e) {
    this.setData({ note: e.detail.value })
  },

  submit: function () {
    const amount = Number(this.data.amount)
    if (!amount || amount <= 0) {
      wx.showToast({ title: '先填个金额', icon: 'none' })
      return
    }
    const cats = this.data.type === 'income' ? INCOME_CATS : EXPENSE_CATS
    store.add({
      id: String(Date.now()) + '-' + Math.floor(Math.random() * 1000),
      date: store.dateKey(),
      month: store.monthKey(),
      type: this.data.type,
      category: this.data.category,
      catLabel: labelOf(cats, this.data.category),
      member: this.data.member,
      note: this.data.note.trim(),
      amount: amount,
      createdAt: Date.now()
    })
    this.setData({ amount: '', note: '' })
    this.reload()
    wx.showToast({ title: '记好了', icon: 'none' })
  },

  onDelete: function (e) {
    const id = e.currentTarget.dataset.id
    const self = this
    wx.showModal({
      title: '删掉这笔',
      content: '删了就找不回来了。',
      confirmColor: '#B4653A',
      success: function (res) {
        if (!res.confirm) return
        store.remove(id)
        self.reload()
        wx.showToast({ title: '已删除', icon: 'none' })
      }
    })
  }
})
