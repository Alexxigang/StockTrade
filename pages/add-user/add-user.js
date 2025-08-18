// pages/add-user/add-user.js
const StorageService = require('../../utils/storage.js')
const CalculationService = require('../../utils/calculation.js')

Page({
  data: {
    isEdit: false,
    editId: '',
    formData: {
      name: '',
      phone: '',
      email: ''
    },
    canSubmit: false
  },

  onLoad(options) {
    if (options.editId) {
      this.setData({
        isEdit: true,
        editId: options.editId
      })
      this.loadUserData(options.editId)
    }
  },

  // 加载用户数据（编辑模式）
  loadUserData(userId) {
    const users = StorageService.getUsers()
    const user = users.find(u => u.id === userId)
    
    if (user) {
      this.setData({
        formData: {
          name: user.name,
          phone: user.phone || '',
          email: user.email || ''
        }
      })
      this.checkCanSubmit()
    }
  },

  // 输入框改变
  onInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    this.setData({
      [`formData.${field}`]: value
    })
    
    this.checkCanSubmit()
  },

  // 检查是否可以提交
  checkCanSubmit() {
    const { formData } = this.data
    const canSubmit = formData.name.trim().length > 0
    
    this.setData({ canSubmit })
  },

  // 提交表单
  onSubmit() {
    if (!this.data.canSubmit) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'error'
      })
      return
    }

    const { formData, isEdit, editId } = this.data
    
    // 构建用户数据
    const userData = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim()
    }

    let success = false
    
    if (isEdit) {
      // 更新用户
      success = StorageService.updateUser(editId, userData)
    } else {
      // 添加新用户
      const newUser = {
        id: CalculationService.generateId('user'),
        ...userData,
        createTime: new Date().toISOString().replace('T', ' ').substr(0, 19)
      }
      success = StorageService.addUser(newUser)
    }

    if (success) {
      wx.showToast({
        title: isEdit ? '更新成功' : '添加成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } else {
      wx.showToast({
        title: isEdit ? '更新失败' : '添加失败',
        icon: 'error'
      })
    }
  },

  // 取消
  onCancel() {
    wx.navigateBack()
  }
})
