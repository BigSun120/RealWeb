/**
 * AI响应的JSON Schema定义
 * 用于结构化输出API，确保AI返回严格符合格式的JSON
 */

/**
 * 大纲幕修改方案的Schema
 * 对应 suggestedContent 字段的结构
 */
export const ACT_MODIFICATION_SCHEMA = {
  name: "act_modification_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      suggestedContent: {
        type: "object",
        properties: {
          _id: {
            type: "string",
            description: "MongoDB内部ID，必须保留"
          },
          id: {
            type: "string",
            description: "幕ID，必须保留"
          },
          actNumber: {
            type: "integer",
            description: "幕编号"
          },
          title: {
            type: "string",
            description: "幕标题"
          },
          description: {
            type: "string",
            description: "幕描述"
          },
          plotPoints: {
            type: "array",
            description: "情节点列表",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "情节点ID，必须保留原始ID"
                },
                name: {
                  type: "string",
                  description: "情节点名称/标题"
                },
                description: {
                  type: "string",
                  description: "情节点描述"
                },
                characters: {
                  type: "array",
                  description: "涉及的角色名字列表",
                  items: {
                    type: "string"
                  }
                },
                emotion: {
                  type: "array",
                  description: "情感变化列表，如['紧张', '惊险']",
                  items: {
                    type: "string"
                  }
                },
                episodeRange: {
                  type: "string",
                  description: "预估集数范围，如'1-3'"
                },
                _id: {
                  type: "string",
                  description: "MongoDB内部ID，必须保留"
                }
              },
              required: ["id", "name", "description", "characters", "emotion", "episodeRange", "_id"],
              additionalProperties: false
            }
          }
        },
        required: ["_id", "id", "actNumber", "title", "description", "plotPoints"],
        additionalProperties: false
      },
      explanation: {
        type: "string",
        description: "修改说明"
      }
    },
    required: ["suggestedContent", "explanation"],
    additionalProperties: false
  }
};

/**
 * 诊断问题列表的Schema
 */
export const DIAGNOSIS_ISSUES_SCHEMA = {
  name: "diagnosis_issues_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      issues: {
        type: "array",
        description: "诊断出的问题列表",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "问题唯一ID"
            },
            type: {
              type: "string",
              description: "问题类型"
            },
            severity: {
              type: "string",
              description: "严重程度：critical/major/minor",
              enum: ["critical", "major", "minor"]
            },
            title: {
              type: "string",
              description: "问题标题"
            },
            description: {
              type: "string",
              description: "问题描述"
            },
            location: {
              type: "string",
              description: "问题位置"
            }
          },
          required: ["id", "type", "severity", "title", "description"],
          additionalProperties: false
        }
      }
    },
    required: ["issues"],
    additionalProperties: false
  }
};

/**
 * 通用解决方案Schema（不特定于某种内容类型）
 */
export const GENERIC_SOLUTION_SCHEMA = {
  name: "generic_solution_response",
  strict: true,
  schema: {
    type: "object",
    properties: {
      suggestedContent: {
        type: "object",
        description: "建议的修改内容，结构根据具体问题类型而定",
        additionalProperties: true
      },
      explanation: {
        type: "string",
        description: "修改说明"
      }
    },
    required: ["suggestedContent", "explanation"],
    additionalProperties: false
  }
};
