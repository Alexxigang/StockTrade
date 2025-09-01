// pages/import-data/import-data.js
const ImportService = require('../../utils/importService.js')
const StorageService = require('../../utils/storage.js')

Page({
  data: {
    users: [],
    selectedUserId: '',
    selectedUserIndex: 0,
    selectedUserName: '请选择用户',
    selectedBroker: 'auto',
    selectedBrokerIndex: 0,
    selectedBrokerName: '自动检测',
    fileContent: null,
    fileName: '',
    previewData: null,
    importResult: null,
    isProcessing: false,
    showPreview: false,
    confidencePercent: 0,
    brokers: [
      { name: '自动检测', value: 'auto' },
      { name: '华泰证券', value: '华泰证券' },
      { name: '东方财富', value: '东方财富' },
      { name: '同花顺', value: '同花顺' },
      { name: '通用模板', value: 'generic' }
    ]
  },

  onLoad() {
    this.loadUsers()
  },

  // 加载用户列表
  loadUsers() {
    const users = StorageService.getUsers()
    if (users.length > 0) {
      this.setData({
        users,
        selectedUserId: users[0].id,
        selectedUserIndex: 0,
        selectedUserName: users[0].name
      })
    } else {
      this.setData({
        users: [],
        selectedUserId: '',
        selectedUserIndex: 0,
        selectedUserName: '请选择用户'
      })
    }
  },

  // 选择用户
  onUserChange(e) {
    const index = parseInt(e.detail.value)
    const user = this.data.users[index]
    if (user) {
      this.setData({
        selectedUserId: user.id,
        selectedUserIndex: index,
        selectedUserName: user.name
      })
    }
  },

  // 选择券商
  onBrokerChange(e) {
    const index = parseInt(e.detail.value)
    const broker = this.data.brokers[index]
    if (broker) {
      this.setData({
        selectedBroker: broker.value,
        selectedBrokerIndex: index,
        selectedBrokerName: broker.name
      })
    }
  },

  // 选择文件
  chooseFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['csv', 'xlsx', 'xls', 'txt'],
      success: (res) => {
        const file = res.tempFiles[0]
        this.setData({
          fileName: file.name
        })
        
        // 读取文件内容
        wx.getFileSystemManager().readFile({
          filePath: file.path,
          encoding: 'utf8',
          success: (result) => {
            this.setData({
              fileContent: result.data
            })
            this.previewImport()
          },
          fail: (error) => {
            wx.showToast({
              title: '文件读取失败',
              icon: 'error'
            })
          }
        })
      },
      fail: () => {
        wx.showToast({
          title: '选择文件失败',
          icon: 'error'
        })
      }
    })
  },

  // 预览导入数据
  async previewImport() {
    if (!this.data.fileContent) {
      wx.showToast({
        title: '请先选择文件',
        icon: 'none'
      })
      return
    }

    this.setData({ isProcessing: true })

    try {
      const result = await ImportService.importTransactions(
        this.data.fileContent,
        this.data.selectedBroker
      )

      if (result.success) {
        this.setData({
          previewData: result,
          showPreview: true,
          importResult: null,
          confidencePercent: Math.round(result.summary.confidence * 100)
        })
      } else {
        wx.showModal({
          title: '预览失败',
          content: result.error,
          showCancel: false
        })
      }
    } catch (error) {
      wx.showModal({
        title: '预览失败',
        content: error.message,
        showCancel: false
      })
    } finally {
      this.setData({ isProcessing: false })
    }
  },

  // 执行导入
  async executeImport() {
    if (!this.data.previewData || !this.data.selectedUserId) {
      wx.showToast({
        title: '请选择用户',
        icon: 'none'
      })
      return
    }

    const { transactions } = this.data.previewData
    if (!transactions || transactions.length === 0) {
      wx.showToast({
        title: '没有可导入的数据',
        icon: 'none'
      })
      return
    }

    this.setData({ isProcessing: true })

    try {
      const result = await ImportService.saveImportedTransactions(
        transactions,
        this.data.selectedUserId
      )

      if (result.success) {
        this.setData({
          importResult: result,
          showPreview: false
        })

        wx.showToast({
          title: `导入成功：${result.summary.saved}条`,
          icon: 'success'
        })

        // 2秒后返回上一页
        setTimeout(() => {
          wx.navigateBack()
        }, 2000)
      } else {
        wx.showModal({
          title: '导入失败',
          content: result.error,
          showCancel: false
        })
      }
    } catch (error) {
      wx.showModal({
        title: '导入失败',
        content: error.message,
        showCancel: false
      })
    } finally {
      this.setData({ isProcessing: false })
    }
  },

  // 下载模板
  downloadTemplate() {
    const template = ImportService.generateTemplate(this.data.selectedBroker)
    if (!template) {
      wx.showToast({
        title: '模板生成失败',
        icon: 'error'
      })
      return
    }

    // 生成CSV内容
    const csvContent = [
      template.headers.join(','),
      ...template.sampleData.map(row => 
        template.headers.map(header => `"${row[header] || ''}"`).join(',')
      )
    ].join('\n')

    // 保存到临时文件
    const fileName = `交易记录导入模板_${template.description}_${new Date().toISOString().slice(0, 10)}.csv`
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`

    wx.getFileSystemManager().writeFile({
      filePath,
      data: csvContent,
      encoding: 'utf8',
      success: () => {
        wx.saveFileToDisk({
          filePath,
          fileName,
          success: () => {
            wx.showToast({
              title: '模板已下载',
              icon: 'success'
            })
          },
          fail: () => {
            // 打开文件预览
            wx.openDocument({
              filePath,
              fileType: 'csv',
              success: () => {
                wx.showToast({
                  title: '模板已打开',
                  icon: 'success'
                })
              },
              fail: () => {
                wx.showToast({
                  title: '打开模板失败',
                  icon: 'error'
                })
              }
            })
          }
        })
      },
      fail: () => {
        wx.showToast({
          title: '生成模板失败',
          icon: 'error'
        })
      }
    })
  },

  // 导出错误报告
  exportErrorReport() {
    if (!this.data.previewData || !this.data.previewData.errors.length) {
      wx.showToast({
        title: '没有错误报告',
        icon: 'none'
      })
      return
    }

    const report = ImportService.generateErrorReport(this.data.previewData.errors)
    const filePath = `${wx.env.USER_DATA_PATH}/${report.filename}`

    wx.getFileSystemManager().writeFile({
      filePath,
      data: report.content,
      encoding: 'utf8',
      success: () => {
        wx.saveFileToDisk({
          filePath,
          fileName: report.filename,
          success: () => {
            wx.showToast({
              title: '错误报告已导出',
              icon: 'success'
            })
          }
        })
      }
    })
  },

  // 取消导入
  cancelImport() {
    this.setData({
      showPreview: false,
      previewData: null,
      importResult: null
    })
  },

  // 重新导入
  reimport() {
    this.setData({
      fileContent: null,
      fileName: '',
      previewData: null,
      importResult: null,
      showPreview: false
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})