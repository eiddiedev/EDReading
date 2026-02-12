import sensitiveWords from './sensitive-data.json';

// 硬编码的高危词 + 本地词库
const SENSITIVE_SET = new Set(sensitiveWords || []);
SENSITIVE_SET.add("敏感测试"); 

export interface SafetyCheckResult {
  isSafe: boolean;
  reason?: string;
  matchedWord?: string;
}

// 判断字符串是否纯英文
function isAscii(str: string) {
  return /^[\x00-\x7F]*$/.test(str);
}

export function checkContentSafety(text: string): SafetyCheckResult {
  if (!text) return { isSafe: true };
  
  const lowerText = text.toLowerCase();
  
  // 1. 硬编码测试
  if (lowerText.includes("敏感测试")) {
    return { isSafe: false, reason: "包含测试敏感词", matchedWord: "敏感测试" };
  }

  // 2. 智能遍历词库
  for (const word of Array.from(SENSITIVE_SET)) {
    // 忽略空词或单字母（减少误杀）
    if (!word || word.length < 2) continue;

    const lowerWord = word.toLowerCase();

    // 🔴 核心修复逻辑
    if (isAscii(lowerWord)) {
      // 英文词：使用正则匹配单词边界 (例如 \bav\b)
      // 只有当 text 里出现独立的 "av" 时才拦截，"have" 不会拦截
      try {
        const regex = new RegExp(`\\b${lowerWord}\\b`, 'i');
        if (regex.test(text)) {
          console.warn(`🚨 Safety Block (English): Hit "${word}"`);
          return { isSafe: false, reason: "内容包含违规词汇", matchedWord: word };
        }
      } catch (e) {
        // 如果正则构建失败（比如词里有特殊符号），回退到普通包含
        if (lowerText.includes(lowerWord)) {
           return { isSafe: false, reason: "内容包含违规词汇", matchedWord: word };
        }
      }
    } else {
      // 中文/混合词：保持普通包含匹配
      if (lowerText.includes(lowerWord)) {
        console.warn(`🚨 Safety Block (Chinese): Hit "${word}"`);
        return { isSafe: false, reason: "内容包含违规词汇", matchedWord: word };
      }
    }
  }

  // 3. 长度防御
  if (text.length > 20000) {
     return { isSafe: false, reason: "内容过长" };
  }

  return { isSafe: true };
}

export function maskSensitiveInfo(text: string): string {
  if (!text) return "";
  if (text.length <= 2) return text;
  return text[0] + "***" + text[text.length - 1];
}