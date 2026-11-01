# 字典接口适配契约

来源：`D:/project/SS.Express.Platform/Doc/Engineering/iam-dictionary-api-contract-2026-10-29.md`当前第20节版本。后端记录12个端点已实现部署；正式客户端使用下列10个端点，Preview继续不发真实请求。资源入库、授权和真实环境联调仍独立，离线Function来源导入不授予SA权限。

全部POST，平台共享，无tenant_id。全部需登录和精确Function；10个后端写接口另需SA，Query/QueryItems不限制SA。前端按页面及按钮资源判权；八个写按钮仅分配给SA，页面不额外判断SA身份。

| 前端使用 | 路径前缀 /iam-admin/Dictionary | Function                    | 请求及响应                                                           |
| -------- | ------------------------------ | --------------------------- | -------------------------------------------------------------------- |
| 查询字典 | /Query                         | IAM.DICTIONARY.QUERY        | page_index/page_size/keyword/dict_type_code/status；分页items/total  |
| 查询值   | /QueryItems                    | IAM.DICTIONARY.QUERY_ITEMS  | dict_type_id及分页/keyword/status；dictionary及分页items             |
| 新建字典 | /Create                        | IAM.DICTIONARY.CREATE       | dict_type_code/dict_type_name/description/items；完整字典及初始items |
| 编辑字典 | /Update                        | IAM.DICTIONARY.UPDATE       | id/version/dict_type_name/description；完整字典                      |
| 启用字典 | /Enable                        | IAM.DICTIONARY.ENABLE       | id/version；完整字典，status=active                                  |
| 停用字典 | /Disable                       | IAM.DICTIONARY.DISABLE      | id/version；完整字典，status=disabled                                |
| 新增值   | /CreateItem                    | IAM.DICTIONARY.CREATE_ITEM  | dict_type_id及值完整字段；完整值                                     |
| 编辑值   | /UpdateItem                    | IAM.DICTIONARY.UPDATE_ITEM  | id/dict_type_id/version及可编辑字段，无item_code；完整值             |
| 启用值   | /EnableItem                    | IAM.DICTIONARY.ENABLE_ITEM  | id/dict_type_id/version；完整值，status=active                       |
| 停用值   | /DisableItem                   | IAM.DICTIONARY.DISABLE_ITEM | id/dict_type_id/version；完整值，status=disabled                     |

后端保留Delete/DeleteItem，但按用户要求，本页无删除按钮、删除端口或删除资源计划。不把删除请求改名为停用，也不用Update/UpdateItem替代独立启停接口。

## 状态与可用性

字典新增status，默认active。Query默认status为空读取全部未删除字典；可筛选active/disabled。QueryItems默认同样读取全部值（含既有null状态），父字典disabled也可维护；值增加只读is_available。只有父字典和该值均active时is_available=true。QueryItems(status=active)按同一规则筛选，父字典停用时空列表而非错误；status=disabled仅筛选子值自身disabled，不伪造子值状态。

线上返回存在大小写混用：考试题型字典为active，值为ACTIVE。正式API适配层对所有查询及写入响应中的字典、值、父字典及新建初始值，只将已知状态按大小写无关方式统一为active/disabled；历史值null保持未设置，未知、空或缺失状态仍拒绝。编码、原始version、is_available及ext_data不参与转换，写入状态仍遵循小写契约。后端如统一输出小写，前端仍正常工作。

启停只改目标状态和自己的审计/版本，不删数据，不改父子或其他值状态/版本，不改历史业务引用。启用父字典不会启用单独disabled的值；启用值不会启用父字典。已删除对象不能通过启用恢复。重复达到目标状态仍校验当前version，当前版本可原样返回，过期版本仍拒绝，不自动重放。

## 字段及错误

正式页使用CurrentPageResources返回的页面及按钮资源，不依赖CurrentProfile.is_sa，也不为此页面额外调用身份接口。原SA标识补充建议已撤回，后端无需为本页新增字段；既有SA写入校验和精确Function鉴权保持有效。

精确DTO见`src/features/iam/dictionaries/types/dictionary.ts`。ID为int32；version为原始字符串，含真实空历史版本`"0"`，不转换成Number。基础字典和值版本独立。完整编辑保留description/item_color/ext_data/status；独立启停只发ID、所属字典ID（仅值）、version，不发名称或额外字段。

稳定code创建时填写、之后只读；trim后不区分大小写判重，已删除编码不重用。code/name为1–100字符，code不含空白/控制字符；description<=2000；初始值<=200条、原子事务。sort_no非负int32，item_color<=30字符，仅作文本。写入status为active/disabled，既有null不默认为启用。JSON支持任意值（含false/0/空字符串/null），UTF-8<=16KiB，不执行HTML或脚本，不存储敏感信息。

正式HTTP适配须检查envelope及reason_code，不只看HTTP200或匹配中文。沿用统一401/403及AUTH_SA_REQUIRED；1100参数/选择器/归属/不可变字段错误，1108 DICT_CODE_CONFLICT，1113 DICT_TYPE_NOT_FOUND/DICT_ITEM_NOT_FOUND，1109 DICT_VERSION_CONFLICT/DICT_TRANSACTION_CONFLICT。冲突保留草稿并刷新核对，未知写入结果禁止自动重放。Create无request_id幂等保证。
