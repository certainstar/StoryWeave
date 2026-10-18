# 错误码

> 版本：v1.0  
> 更新日期：2026-10-16  
> 用于 [API](./API.md) 的失败返回

命令失败时返回 `ApiError`。界面只显示 `message`。`code` 和 `reason` 给程序分支用，不直接念给作者。

```ts
interface ApiError {
  code: ErrorCode;
  reason?: string;
  message: string;
}
```

`message` 写作者下一步能做什么。里面不放本机绝对路径、密钥、正文全文。项目路径只在设置页显示，不塞进错误句。

开发日志可以保留 `code` 和 `reason`。日志同样不记录密钥和正文全文。

## 错误码

| code | 含义 | 数据 | 作者看到的方向 |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 参数不合法 | 不写入 | 改这一项再保存。具体句子看下面的 reason |
| `NOT_FOUND` | 项目或对象不存在 | 不写入 | 对象已不在。回到列表 |
| `CONFLICT` | 唯一性或顺序冲突 | 不写入 | 刷新当前项目后再改 |
| `STORAGE_ERROR` | 数据库或文件读写失败 | 停在上一次成功提交 | 刚才这次没有保存。可以重试 |
| `MIGRATION_ERROR` | 打开项目时迁移失败 | 不继续迁移 | 可以用最近的快照恢复 |
| `BACKUP_ERROR` | 快照或恢复失败 | 当前项目保持原样 | 恢复没有执行 |
| `IMPORT_ERROR` | 导入文件不可用 | 当前项目保持原样 | 这份文件不能导入 |
| `EXPORT_ERROR` | 导出没有写完 | 不留下半份导出 | 导出没有完成，可以重试 |
| `AI_PROVIDER_ERROR` | 模型请求失败 | 不写入 | 本阶段命令不会返回这一码。留给以后的模型功能 |

`STORAGE_ERROR`、`MIGRATION_ERROR`、`IMPORT_ERROR` 发生时，已经成功提交的数据必须仍能打开。

## VALIDATION_ERROR 的 reason

| reason | 何时 | message |
| --- | --- | --- |
| `EMPTY_NAME` | 项目、人物、事件、故事线、章节或笔记的名称是空白 | 名称不能为空 |
| `SELF_RELATION` | 关系的两端是同一个人 | 不能把人物连向自己 |
| `UNKNOWN_TYPE` | 关系类型不在预设列表中 | 选择一种关系类型 |
| `UNKNOWN_STATUS` | 人物或章节状态不在预设列表中 | 选择一种状态 |
| `UNKNOWN_KIND` | 故事线类型不在预设列表中 | 选择一种故事线 |
| `DUPLICATE_LINK` | 同一条故事线里重复加入同一个事件，或同一章节重复关联同一对象 | 已经在里面了 |

其他校验失败使用 `VALIDATION_ERROR`，`reason` 可以省略，`message` 仍要说明该改哪一项。

## 命令与错误码

| 情况 | code |
| --- | --- |
| 按 id 读取或更新时对象不在当前项目 | `NOT_FOUND` |
| 删除已经不存在的对象 | `NOT_FOUND` |
| 名称空白、自关系、非法枚举、重复加入 | `VALIDATION_ERROR` |
| 数据库忙、磁盘满、文件无法写入 | `STORAGE_ERROR` |
| 项目库版本无法迁移 | `MIGRATION_ERROR` |
| 快照复制不完整，或恢复前校验失败 | `BACKUP_ERROR` |
| 导入文件打不开、字段不符、版本不认识 | `IMPORT_ERROR` |
| 导出写到一半失败 | `EXPORT_ERROR` |

导入和恢复在校验失败时不得开始覆盖。覆盖前先做快照；快照本身失败则返回 `BACKUP_ERROR`，并停止覆盖。
