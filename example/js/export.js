@observable
export default class MainStore extends Base {
  // 被观察的属性
  @observable statistics = {}
  @observable dagData = {}
  @observable paramInfo = ''

  constructor() {
    const newBuildType = {
      flow: '工作流',
      task: `离线${taskTxt}`,
      stream: `实时${taskTxt}`,
      script: `临时${taskTxt}`,
      table: '表',
      resource: '资源',
      function: '函数',
    }
  }
}
