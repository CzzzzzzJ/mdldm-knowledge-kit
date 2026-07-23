# Core Modules

这里承载与具体第三方服务无关的领域模块：

`site`、`identity`、`catalog`、`entitlement`、`commerce`、`media`、`learning`、`operations`。

模块只能依赖自身领域对象、共享基础类型和明确的 Port，不得直接导入 Provider SDK。

