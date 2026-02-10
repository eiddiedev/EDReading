import { DictionaryResult } from "@/types";
import { lookupWordAI } from "@/lib/ai";
import { lookupLocal } from "@/lib/local-dictionary";
import { exampleTranslations } from "./dictionary-translations";
// @ts-ignore
import nlp from "compromise";

// 辅助函数：获取例句翻译
function getExampleTranslation(example: string): string | undefined {
  return exampleTranslations[example];
}

// Mock dictionary data - 扩展的中文释义字典
const mockDictionary: Record<string, DictionaryResult> = {
  "lead to": {
    word: "lead to",
    phonetic: "/liːd tuː/",
    definition: "v. 导致，引起",
    example: "Hard work leads to success.",
    exampleTranslation: "努力工作导致成功。",
    tags: ["因果关系", "高频短语"],
  },
  "result in": {
    word: "result in",
    phonetic: "/rɪˈzʌlt ɪn/",
    definition: "v. 导致，造成",
    example: "The accident resulted in injuries.",
    exampleTranslation: "事故造成了受伤。",
    tags: ["因果关系", "雅思短语"],
  },
  "be responsible for": {
    word: "be responsible for",
    phonetic: "/biː rɪˈspɒnsəbl fɔːr/",
    definition: "v. 对...负责；是...的原因",
    example: "Humans are responsible for climate change.",
    exampleTranslation: "人类应对气候变化负责。",
    tags: ["责任表达", "常用短语"],
  },
  "contribute to": {
    word: "contribute to",
    phonetic: "/kənˈtrɪbjuːt tuː/",
    definition: "v. 有助于；促成；捐献",
    example: "Exercise contributes to good health.",
    exampleTranslation: "运动有助于健康。",
    tags: ["积极表达", "雅思短语"],
  },
  "come up with": {
    word: "come up with",
    phonetic: "/kʌm ʌp wɪð/",
    definition: "v. 想出，提出（想法、计划等）",
    example: "She came up with a brilliant idea.",
    exampleTranslation: "她想出了一个绝妙的主意。",
    tags: ["思维表达", "常用口语"],
  },
  "as well as": {
    word: "as well as",
    phonetic: "/æz wel æz/",
    definition: "conj. 也，既...又...",
    example: "He speaks English as well as French.",
    exampleTranslation: "他既说法语也说英语。",
    tags: ["连接词", "高频短语"],
  },
  "in terms of": {
    word: "in terms of",
    phonetic: "/ɪn tɜːrmz ʌv/",
    definition: "prep. 就...而言，在...方面",
    example: "It was a success in terms of profit.",
    exampleTranslation: "就利润而言，它是成功的。",
    tags: ["学术短语", "常用表达"],
  },
  "due to": {
    word: "due to",
    phonetic: "/duː tuː/",
    definition: "prep. 由于，因为",
    example: "The game was cancelled due to rain.",
    exampleTranslation: "比赛因雨取消。",
    tags: ["因果关系", "正式用语"],
  },
  "in addition to": {
    word: "in addition to",
    phonetic: "/ɪn əˈdɪʃn tuː/",
    definition: "prep. 除...之外（还有）",
    example: "In addition to apples, I bought oranges.",
    exampleTranslation: "除了苹果，我还买了橘子。",
    tags: ["补充说明", "常用短语"],
  },
  "according to": {
    word: "according to",
    phonetic: "/əˈkɔːrdɪŋ tuː/",
    definition: "prep. 根据，按照",
    example: "According to the weather forecast, it will rain.",
    exampleTranslation: "根据天气预报，将会下雨。",
    tags: ["引用表达", "高频短语"],
  },
  "global warming": {
    word: "global warming",
    phonetic: "/ˌɡloʊbl ˈwɔːrmɪŋ/",
    definition: "n. 全球变暖",
    example: "Global warming is a serious threat.",
    exampleTranslation: "全球变暖是一个严重的威胁。",
    tags: ["环境话题", "核心词汇"],
  },
  "sea level": {
    word: "sea level",
    phonetic: "/siː ˈlevl/",
    definition: "n. 海平面",
    example: "The city is above sea level.",
    exampleTranslation: "这座城市在海平面以上。",
    tags: ["地理词汇", "环境话题"],
  },
  "artificial intelligence": {
    word: "artificial intelligence",
    phonetic: "/ˌɑːrtɪˈfɪʃəl ɪnˈtelɪdʒəns/",
    definition: "n. 人工智能",
    example: "Artificial intelligence is transforming our world.",
    exampleTranslation: "人工智能正在改变我们的世界。",
    tags: ["科技热词", "雅思核心"],
  },
  "climate change": {
    word: "climate change",
    phonetic: "/ˈklaɪmət tʃeɪndʒ/",
    definition: "n. 气候变化",
    example: "Climate change is a global issue.",
    exampleTranslation: "气候变化是一个全球性问题。",
    tags: ["环境话题", "高频短语"],
  },
  "machine learning": {
    word: "machine learning",
    phonetic: "/məˈʃiːn ˈlɜːrnɪŋ/",
    definition: "n. 机器学习",
    example: "Machine learning is a subset of AI.",
    exampleTranslation: "机器学习是人工智能的一个子集。",
    tags: ["科技热词"],
  },
  "account for": {
    word: "account for",
    phonetic: "/əˈkaʊnt fɔːr/",
    definition: "v. 说明，解释；占（比例）",
    example: "These advancements account for significant improvements.",
    exampleTranslation: "这些进步解释了效率的显著提高。",
    tags: ["雅思短语", "高频搭配"],
  },
  "cope with": {
    word: "cope with",
    phonetic: "/koʊp wɪð/",
    definition: "v. 处理，应对",
    example: "We must cope with ethical challenges.",
    exampleTranslation: "我们必须应对伦理挑战。",
    tags: ["雅思短语", "高频搭配"],
  },
  "sea levels": {
    word: "sea levels",
    phonetic: "/siː ˈlevəlz/",
    definition: "n. 海平面（复数）",
    example: "Rising temperatures cause sea levels to rise.",
    exampleTranslation: "气温上升导致海平面上升。",
    tags: ["环境话题"],
  },
  "weather patterns": {
    word: "weather patterns",
    phonetic: "/ˈweðər ˈpætərnz/",
    definition: "n. 天气模式",
    example: "Weather patterns are shifting.",
    exampleTranslation: "天气模式正在转变。",
    tags: ["环境话题"],
  },
  "make predictions": {
    word: "make predictions",
    phonetic: "/meɪk prɪˈdɪkʃənz/",
    definition: "v. 做出预测",
    example: "Scientists make predictions about future climate trends.",
    exampleTranslation: "科学家对未来气候趋势做出预测。",
    tags: ["学术短语", "高频搭配"],
  },
  "melting ice caps": {
    word: "melting ice caps",
    phonetic: "/ˈmeltɪŋ aɪs kæps/",
    definition: "n. 融化的冰盖",
    example: "Melting ice caps contribute to rising sea levels.",
    exampleTranslation: "融化的冰盖导致海平面上升。",
    tags: ["环境话题", "气候词汇"],
  },
  "play a role": {
    word: "play a role",
    phonetic: "/pleɪ ə roʊl/",
    definition: "v. 发挥作用，扮演角色",
    example: "Technology plays a role in modern education.",
    exampleTranslation: "技术在现代教育中发挥着作用。",
    tags: ["高频短语", "常用搭配"],
  },
  "take into account": {
    word: "take into account",
    phonetic: "/teɪk ˈɪntuː əˈkaʊnt/",
    definition: "v. 考虑，顾及",
    example: "We must take into account all possible factors.",
    exampleTranslation: "我们必须考虑所有可能的因素。",
    tags: ["雅思短语", "正式表达"],
  },
  "focus on": {
    word: "focus on",
    phonetic: "/ˈfoʊkəs ɒn/",
    definition: "v. 专注于，集中于",
    example: "Students should focus on their studies.",
    exampleTranslation: "学生应该专注于学习。",
    tags: ["常用短语", "学习词汇"],
  },
  "depend on": {
    word: "depend on",
    phonetic: "/dɪˈpend ɒn/",
    definition: "v. 依赖，取决于",
    example: "Success depends on hard work.",
    exampleTranslation: "成功取决于努力工作。",
    tags: ["基础短语", "常用搭配"],
  },
  "rely on": {
    word: "rely on",
    phonetic: "/rɪˈlaɪ ɒn/",
    definition: "v. 依靠，信赖",
    example: "You can rely on me for help.",
    exampleTranslation: "你可以依靠我帮忙。",
    tags: ["常用短语", "信任表达"],
  },
  "carry out": {
    word: "carry out",
    phonetic: "/ˈkæri aʊt/",
    definition: "v. 执行，实施",
    example: "Scientists carry out experiments.",
    exampleTranslation: "科学家执行实验。",
    tags: ["学术短语", "行动表达"],
  },
  "make up": {
    word: "make up",
    phonetic: "/meɪk ʌp/",
    definition: "v. 组成，编造；化妆",
    example: "Water makes up most of the Earth's surface.",
    exampleTranslation: "水构成了地球表面的大部分。",
    tags: ["多义短语", "常用搭配"],
  },
  "turn out": {
    word: "turn out",
    phonetic: "/tɜːrn aʊt/",
    definition: "v. 结果是，证明是",
    example: "It turned out to be a great success.",
    exampleTranslation: "结果证明非常成功。",
    tags: ["结果表达", "常用短语"],
  },
  "set up": {
    word: "set up",
    phonetic: "/set ʌp/",
    definition: "v. 建立，设立",
    example: "They set up a new company.",
    exampleTranslation: "他们建立了一家新公司。",
    tags: ["商业短语", "建设表达"],
  },
  "give up": {
    word: "give up",
    phonetic: "/ɡɪv ʌp/",
    definition: "v. 放弃，投降",
    example: "Never give up on your dreams.",
    exampleTranslation: "永远不要放弃你的梦想。",
    tags: ["励志短语", "常用表达"],
  },
  "look for": {
    word: "look for",
    phonetic: "/lʊk fɔːr/",
    definition: "v. 寻找",
    example: "I'm looking for my keys.",
    exampleTranslation: "我在找我的钥匙。",
    tags: ["基础短语", "日常用语"],
  },
  "look forward to": {
    word: "look forward to",
    phonetic: "/lʊk ˈfɔːrwərd tuː/",
    definition: "v. 期待，盼望",
    example: "I look forward to seeing you.",
    exampleTranslation: "我期待见到你。",
    tags: ["礼貌表达", "常用短语"],
  },
  "participate in": {
    word: "participate in",
    phonetic: "/pɑːrˈtɪsɪpeɪt ɪn/",
    definition: "v. 参与，参加",
    example: "Students participate in class discussions.",
    exampleTranslation: "学生参与课堂讨论。",
    tags: ["学术短语", "活动表达"],
  },
  "succeed in": {
    word: "succeed in",
    phonetic: "/səkˈsiːd ɪn/",
    definition: "v. 在...方面成功",
    example: "She succeeded in passing the exam.",
    exampleTranslation: "她成功通过了考试。",
    tags: ["成功表达", "常用短语"],
  },
  the: {
    word: "the",
    phonetic: "/ðə/",
    definition: "定冠词，用于特指",
    example: "The book is on the table.",
    exampleTranslation: "书在桌子上。",
    tags: ["基础词汇"],
  },
  a: {
    word: "a",
    phonetic: "/ə/",
    definition: "不定冠词，用于泛指",
    example: "A book is on the table.",
    exampleTranslation: "一本书在桌子上。",
    tags: ["基础词汇"],
  },
  an: {
    word: "an",
    phonetic: "/ən/",
    definition: "不定冠词，用于以元音开头的词前",
    example: "An apple a day keeps the doctor away.",
    exampleTranslation: "一天一苹果，医生远离我。",
    tags: ["基础词汇"],
  },
  is: {
    word: "is",
    phonetic: "/ɪz/",
    definition: "v. 是（be的第三人称单数现在式）",
    example: "He is a teacher.",
    exampleTranslation: "他是一名教师。",
    tags: ["基础词汇"],
  },
  are: {
    word: "are",
    phonetic: "/ɑːr/",
    definition: "v. 是（be的复数现在式）",
    example: "They are students.",
    exampleTranslation: "他们是学生。",
    tags: ["基础词汇"],
  },
  was: {
    word: "was",
    phonetic: "/wəz/",
    definition: "v. 是（be的第一、三人称单数过去式）",
    example: "He was happy.",
    exampleTranslation: "他很开心。",
    tags: ["基础词汇"],
  },
  were: {
    word: "were",
    phonetic: "/wɜːr/",
    definition: "v. 是（be的复数过去式）",
    example: "They were friends.",
    exampleTranslation: "他们是朋友。",
    tags: ["基础词汇"],
  },
  be: {
    word: "be",
    phonetic: "/biː/",
    definition: "v. 是，存在",
    example: "To be or not to be.",
    exampleTranslation: "生存还是毁灭。",
    tags: ["基础词汇"],
  },
  have: {
    word: "have",
    phonetic: "/hæv/",
    definition: "v. 有，拥有",
    example: "I have a book.",
    exampleTranslation: "我有一本书。",
    tags: ["基础词汇"],
  },
  has: {
    word: "has",
    phonetic: "/hæz/",
    definition: "v. 有（have的第三人称单数）",
    example: "She has a cat.",
    exampleTranslation: "她有一只猫。",
    tags: ["基础词汇"],
  },
  had: {
    word: "had",
    phonetic: "/hæd/",
    definition: "v. 有（have的过去式）",
    example: "He had a car.",
    exampleTranslation: "他有一辆车。",
    tags: ["基础词汇"],
  },
  do: {
    word: "do",
    phonetic: "/duː/",
    definition: "v. 做，执行",
    example: "I do my homework.",
    exampleTranslation: "我做作业。",
    tags: ["基础词汇"],
  },
  does: {
    word: "does",
    phonetic: "/dʌz/",
    definition: "v. 做（do的第三人称单数）",
    example: "She does her work well.",
    exampleTranslation: "她工作做得很好。",
    tags: ["基础词汇"],
  },
  did: {
    word: "did",
    phonetic: "/dɪd/",
    definition: "v. 做（do的过去式）",
    example: "He did his best.",
    exampleTranslation: "他尽了最大努力。",
    tags: ["基础词汇"],
  },
  will: {
    word: "will",
    phonetic: "/wɪl/",
    definition: "aux. 将，会",
    example: "I will go tomorrow.",
    exampleTranslation: "我明天会去。",
    tags: ["基础词汇"],
  },
  would: {
    word: "would",
    phonetic: "/wʊd/",
    definition: "aux. 会，愿意",
    example: "I would like to go.",
    exampleTranslation: "我想去。",
    tags: ["基础词汇"],
  },
  can: {
    word: "can",
    phonetic: "/kæn/",
    definition: "aux. 能，可以",
    example: "I can swim.",
    exampleTranslation: "我会游泳。",
    tags: ["基础词汇"],
  },
  could: {
    word: "could",
    phonetic: "/kʊd/",
    definition: "aux. 能（can的过去式）",
    example: "I could swim when I was young.",
    exampleTranslation: "我年轻时会游泳。",
    tags: ["基础词汇"],
  },
  should: {
    word: "should",
    phonetic: "/ʃʊd/",
    definition: "aux. 应该",
    example: "You should study hard.",
    exampleTranslation: "你应该努力学习。",
    tags: ["基础词汇", "重点词汇"],
  },
  may: {
    word: "may",
    phonetic: "/meɪ/",
    definition: "aux. 可能，可以",
    example: "You may go now.",
    exampleTranslation: "你现在可以走了。",
    tags: ["基础词汇"],
  },
  might: {
    word: "might",
    phonetic: "/maɪt/",
    definition: "aux. 可能（may的过去式）",
    example: "It might rain tomorrow.",
    exampleTranslation: "明天可能会下雨。",
    tags: ["基础词汇"],
  },
  must: {
    word: "must",
    phonetic: "/mʌst/",
    definition: "aux. 必须",
    example: "You must finish your homework.",
    exampleTranslation: "你必须完成作业。",
    tags: ["基础词汇", "重点词汇"],
  },
  book: {
    word: "book",
    phonetic: "/bʊk/",
    definition: "n. 书，书籍",
    example: "I'm reading a good book.",
    exampleTranslation: "我正在读一本好书。",
    tags: ["基础词汇"],
  },
  reading: {
    word: "reading",
    phonetic: "/ˈriːdɪŋ/",
    definition: "n. 阅读，读物",
    example: "Reading improves vocabulary.",
    exampleTranslation: "阅读能提高词汇量。",
    tags: ["核心词汇"],
  },
  vocabulary: {
    word: "vocabulary",
    phonetic: "/vəˈkæbjələri/",
    definition: "n. 词汇，词汇量",
    example: "She has an extensive vocabulary.",
    exampleTranslation: "她有丰富的词汇量。",
    tags: ["雅思核心", "学术词汇"],
  },
  practice: {
    word: "practice",
    phonetic: "/ˈpræktɪs/",
    definition: "n. 练习，实践",
    example: "Practice makes perfect.",
    exampleTranslation: "熟能生巧。",
    tags: ["地道表达", "高频词汇"],
  },
  article: {
    word: "article",
    phonetic: "/ˈɑːrtɪkəl/",
    definition: "n. 文章，物品",
    example: "This is an interesting article.",
    exampleTranslation: "这是一篇有趣的文章。",
    tags: ["学术词汇", "雅思核心"],
  },
  word: {
    word: "word",
    phonetic: "/wɜːrd/",
    definition: "n. 单词，词",
    example: "Can you spell this word?",
    exampleTranslation: "你能拼写这个单词吗？",
    tags: ["基础词汇"],
  },
  sentence: {
    word: "sentence",
    phonetic: "/ˈsentəns/",
    definition: "n. 句子",
    example: "This is a complete sentence.",
    exampleTranslation: "这是一个完整的句子。",
    tags: ["基础词汇", "学术词汇"],
  },
  analyze: {
    word: "analyze",
    phonetic: "/ˈænəlaɪz/",
    definition: "v. 分析，解析",
    example: "Let's analyze this sentence.",
    exampleTranslation: "让我们分析这个句子。",
    tags: ["学术词汇", "雅思核心"],
  },
  definition: {
    word: "definition",
    phonetic: "/ˌdefɪˈnɪʃən/",
    definition: "n. 定义，释义",
    example: "What's the definition of this word?",
    exampleTranslation: "这个单词的定义是什么？",
    tags: ["学术词汇"],
  },
  intelligence: {
    word: "intelligence",
    phonetic: "/ɪnˈtelɪdʒəns/",
    definition: "n. 智力，智能",
    example: "Artificial intelligence is developing rapidly.",
    exampleTranslation: "人工智能正在快速发展。",
  },
  artificial: {
    word: "artificial",
    phonetic: "/ˌɑːrtɪˈfɪʃəl/",
    definition: "adj. 人工的，人造的",
    example: "Artificial intelligence is transforming our world.",
    exampleTranslation: "人工智能正在改变我们的世界。",
  },
  future: {
    word: "future",
    phonetic: "/ˈfjuːtʃər/",
    definition: "n. 未来，将来",
    example: "The future of technology is exciting.",
    exampleTranslation: "技术的未来令人兴奋。",
  },
  climate: {
    word: "climate",
    phonetic: "/ˈklaɪmət/",
    definition: "n. 气候",
    example: "Climate change is a global issue.",
    exampleTranslation: "气候变化是一个全球性问题。",
  },
  change: {
    word: "change",
    phonetic: "/tʃeɪndʒ/",
    definition: "n./v. 改变，变化",
    example: "We need to change our habits.",
    exampleTranslation: "我们需要改变我们的习惯。",
  },
  impact: {
    word: "impact",
    phonetic: "/ˈɪmpækt/",
    definition: "n. 影响，冲击",
    example: "The impact of technology is huge.",
    exampleTranslation: "技术的影响是巨大的。",
  },
  benefit: {
    word: "benefit",
    phonetic: "/ˈbenɪfɪt/",
    definition: "n. 好处，益处",
    example: "Reading has many benefits.",
    exampleTranslation: "阅读有很多好处。",
  },
  benefits: {
    word: "benefits",
    phonetic: "/ˈbenɪfɪts/",
    definition: "n. 好处，益处（复数）",
    example: "The benefits of exercise are numerous.",
    exampleTranslation: "运动的好处很多。",
  },
  transform: {
    word: "transform",
    phonetic: "/trænsˈfɔːrm/",
    definition: "v. 转变，改变",
    example: "Technology transforms our lives.",
    exampleTranslation: "技术改变我们的生活。",
  },
  transforming: {
    word: "transforming",
    phonetic: "/trænsˈfɔːrmɪŋ/",
    definition: "v. 正在转变（transform的现在分词）",
    example: "AI is transforming industries.",
    exampleTranslation: "人工智能正在改变各个行业。",
  },
  machine: {
    word: "machine",
    phonetic: "/məˈʃiːn/",
    definition: "n. 机器",
    example: "The machine is working well.",
    exampleTranslation: "机器运转良好。",
  },
  learning: {
    word: "learning",
    phonetic: "/ˈlɜːrnɪŋ/",
    definition: "n. 学习",
    example: "Machine learning is a branch of AI.",
    exampleTranslation: "机器学习是人工智能的一个分支。",
  },
  algorithm: {
    word: "algorithm",
    phonetic: "/ˈælɡərɪðəm/",
    definition: "n. 算法",
    example: "This algorithm is very efficient.",
    exampleTranslation: "这个算法非常高效。",
  },
  algorithms: {
    word: "algorithms",
    phonetic: "/ˈælɡərɪðəmz/",
    definition: "n. 算法（复数）",
    example: "These algorithms process data quickly.",
    exampleTranslation: "这些算法能快速处理数据。",
  },
  process: {
    word: "process",
    phonetic: "/ˈprɑːses/",
    definition: "v. 处理，加工",
    example: "Computers process information.",
    exampleTranslation: "计算机处理信息。",
  },
  data: {
    word: "data",
    phonetic: "/ˈdeɪtə/",
    definition: "n. 数据",
    example: "We need to analyze this data.",
    exampleTranslation: "我们需要分析这些数据。",
  },
  prediction: {
    word: "prediction",
    phonetic: "/prɪˈdɪkʃən/",
    definition: "n. 预测",
    example: "The prediction was accurate.",
    exampleTranslation: "预测是准确的。",
  },
  predictions: {
    word: "predictions",
    phonetic: "/prɪˈdɪkʃənz/",
    definition: "n. 预测（复数）",
    example: "These predictions are based on data.",
    exampleTranslation: "这些预测基于数据。",
  },
  accuracy: {
    word: "accuracy",
    phonetic: "/ˈækjərəsi/",
    definition: "n. 准确性",
    example: "The accuracy of the model is high.",
    exampleTranslation: "模型的准确性很高。",
  },
  application: {
    word: "application",
    phonetic: "/ˌæplɪˈkeɪʃən/",
    definition: "n. 应用，申请",
    example: "This application is very useful.",
    exampleTranslation: "这个应用非常有用。",
  },
  applications: {
    word: "applications",
    phonetic: "/ˌæplɪˈkeɪʃənz/",
    definition: "n. 应用（复数）",
    example: "The applications of AI are endless.",
    exampleTranslation: "人工智能的应用是无穷无尽的。",
  },
  endless: {
    word: "endless",
    phonetic: "/ˈendləs/",
    definition: "adj. 无尽的，无限的",
    example: "The possibilities are endless.",
    exampleTranslation: "可能性是无穷无尽的。",
  },
  healthcare: {
    word: "healthcare",
    phonetic: "/ˈhelθker/",
    definition: "n. 医疗保健",
    example: "Healthcare is important for everyone.",
    exampleTranslation: "医疗保健对每个人都很重要。",
  },
  transportation: {
    word: "transportation",
    phonetic: "/ˌtrænspɔːrˈteɪʃən/",
    definition: "n. 交通运输",
    example: "Public transportation is convenient.",
    exampleTranslation: "公共交通很方便。",
  },
  education: {
    word: "education",
    phonetic: "/ˌedʒuˈkeɪʃən/",
    definition: "n. 教育",
    example: "Education is the key to success.",
    exampleTranslation: "教育是成功的关键。",
  },
  entertainment: {
    word: "entertainment",
    phonetic: "/ˌentərˈteɪnmənt/",
    definition: "n. 娱乐",
    example: "Movies are a form of entertainment.",
    exampleTranslation: "电影是一种娱乐形式。",
  },
  pressing: {
    word: "pressing",
    phonetic: "/ˈpresɪŋ/",
    definition: "adj. 紧迫的，迫切的",
    example: "Climate change is a pressing issue.",
    exampleTranslation: "气候变化是一个紧迫的问题。",
  },
  issue: {
    word: "issue",
    phonetic: "/ˈɪʃuː/",
    definition: "n. 问题，议题",
    example: "This is an important issue.",
    exampleTranslation: "这是一个重要的问题。",
  },
  issues: {
    word: "issues",
    phonetic: "/ˈɪʃuːz/",
    definition: "n. 问题（复数）",
    example: "We need to address these issues.",
    exampleTranslation: "我们需要解决这些问题。",
  },
  rising: {
    word: "rising",
    phonetic: "/ˈraɪzɪŋ/",
    definition: "adj. 上升的，增长的",
    example: "Rising temperatures are a concern.",
    exampleTranslation: "气温上升是一个令人担忧的问题。",
  },
  global: {
    word: "global",
    phonetic: "/ˈɡloʊbəl/",
    definition: "adj. 全球的",
    example: "Global warming is a serious problem.",
    exampleTranslation: "全球变暖是一个严重的问题。",
  },
  temperature: {
    word: "temperature",
    phonetic: "/ˈtemprətʃər/",
    definition: "n. 温度",
    example: "The temperature is rising.",
    exampleTranslation: "温度正在上升。",
  },
  temperatures: {
    word: "temperatures",
    phonetic: "/ˈtemprətʃərz/",
    definition: "n. 温度（复数）",
    example: "Global temperatures are increasing.",
    exampleTranslation: "全球温度正在上升。",
  },
  causing: {
    word: "causing",
    phonetic: "/ˈkɔːzɪŋ/",
    definition: "v. 引起（cause的现在分词）",
    example: "Pollution is causing problems.",
    exampleTranslation: "污染正在造成问题。",
  },
  level: {
    word: "level",
    phonetic: "/ˈlevəl/",
    definition: "n. 水平，级别",
    example: "The sea level is rising.",
    exampleTranslation: "海平面正在上升。",
  },
  levels: {
    word: "levels",
    phonetic: "/ˈlevəlz/",
    definition: "n. 水平（复数）",
    example: "Sea levels are rising.",
    exampleTranslation: "海平面正在上升。",
  },
  weather: {
    word: "weather",
    phonetic: "/ˈweðər/",
    definition: "n. 天气",
    example: "The weather is nice today.",
    exampleTranslation: "今天天气很好。",
  },
  pattern: {
    word: "pattern",
    phonetic: "/ˈpætərn/",
    definition: "n. 模式，图案",
    example: "Weather patterns are changing.",
    exampleTranslation: "天气模式正在改变。",
  },
  patterns: {
    word: "patterns",
    phonetic: "/ˈpætərnz/",
    definition: "n. 模式（复数）",
    example: "Weather patterns are shifting.",
    exampleTranslation: "天气模式正在转变。",
  },
  shift: {
    word: "shift",
    phonetic: "/ʃɪft/",
    definition: "v. 转变，移动",
    example: "The wind is shifting.",
    exampleTranslation: "风向正在改变。",
  },
  ecosystem: {
    word: "ecosystem",
    phonetic: "/ˈiːkoʊsɪstəm/",
    definition: "n. 生态系统",
    example: "The ecosystem is fragile.",
    exampleTranslation: "生态系统很脆弱。",
  },
  ecosystems: {
    word: "ecosystems",
    phonetic: "/ˈiːkoʊsɪstəmz/",
    definition: "n. 生态系统（复数）",
    example: "Ecosystems are changing.",
    exampleTranslation: "生态系统正在改变。",
  },
  scientist: {
    word: "scientist",
    phonetic: "/ˈsaɪəntɪst/",
    definition: "n. 科学家",
    example: "The scientist made a discovery.",
    exampleTranslation: "科学家有了一个发现。",
  },
  scientists: {
    word: "scientists",
    phonetic: "/ˈsaɪəntɪsts/",
    definition: "n. 科学家（复数）",
    example: "Scientists are researching solutions.",
    exampleTranslation: "科学家正在研究解决方案。",
  },
  world: {
    word: "world",
    phonetic: "/wɜːrld/",
    definition: "n. 世界",
    example: "The world is changing.",
    exampleTranslation: "世界正在改变。",
  },
  understand: {
    word: "understand",
    phonetic: "/ˌʌndərˈstænd/",
    definition: "v. 理解",
    example: "I understand the problem.",
    exampleTranslation: "我理解这个问题。",
  },
  develop: {
    word: "develop",
    phonetic: "/dɪˈveləp/",
    definition: "v. 发展，开发",
    example: "We need to develop new solutions.",
    exampleTranslation: "我们需要开发新的解决方案。",
  },
  solution: {
    word: "solution",
    phonetic: "/səˈluːʃən/",
    definition: "n. 解决方案",
    example: "We found a solution.",
    exampleTranslation: "我们找到了一个解决方案。",
  },
  solutions: {
    word: "solutions",
    phonetic: "/səˈluːʃənz/",
    definition: "n. 解决方案（复数）",
    example: "We need to develop solutions.",
    exampleTranslation: "我们需要开发解决方案。",
  },
  fundamental: {
    word: "fundamental",
    phonetic: "/ˌfʌndəˈmentəl/",
    definition: "adj. 基本的，根本的",
    example: "Reading is a fundamental skill.",
    exampleTranslation: "阅读是一项基本技能。",
  },
  skill: {
    word: "skill",
    phonetic: "/skɪl/",
    definition: "n. 技能",
    example: "Reading is an important skill.",
    exampleTranslation: "阅读是一项重要技能。",
  },
  skills: {
    word: "skills",
    phonetic: "/skɪlz/",
    definition: "n. 技能（复数）",
    example: "Reading improves your skills.",
    exampleTranslation: "阅读能提高你的技能。",
  },
  open: {
    word: "open",
    phonetic: "/ˈoʊpən/",
    definition: "v. 打开",
    example: "Open the door, please.",
    exampleTranslation: "请开门。",
  },
  opens: {
    word: "opens",
    phonetic: "/ˈoʊpənz/",
    definition: "v. 打开（第三人称单数）",
    example: "Reading opens doors to knowledge.",
    exampleTranslation: "阅读为知识打开大门。",
  },
  door: {
    word: "door",
    phonetic: "/dɔːr/",
    definition: "n. 门",
    example: "Close the door.",
    exampleTranslation: "关上门。",
  },
  doors: {
    word: "doors",
    phonetic: "/dɔːrz/",
    definition: "n. 门（复数）",
    example: "Reading opens doors to knowledge.",
    exampleTranslation: "阅读为知识打开大门。",
  },
  knowledge: {
    word: "knowledge",
    phonetic: "/ˈnɑːlɪdʒ/",
    definition: "n. 知识",
    example: "Knowledge is power.",
    exampleTranslation: "知识就是力量。",
  },
  imagination: {
    word: "imagination",
    phonetic: "/ɪˌmædʒɪˈneɪʃən/",
    definition: "n. 想象力",
    example: "Use your imagination.",
    exampleTranslation: "发挥你的想象力。",
  },
  regularly: {
    word: "regularly",
    phonetic: "/ˈreɡjələrli/",
    definition: "adv. 定期地，经常地",
    example: "I exercise regularly.",
    exampleTranslation: "我定期锻炼。",
  },
  improve: {
    word: "improve",
    phonetic: "/ɪmˈpruːv/",
    definition: "v. 改善，提高",
    example: "Practice helps improve skills.",
    exampleTranslation: "练习有助于提高技能。",
  },
  enhance: {
    word: "enhance",
    phonetic: "/ɪnˈhæns/",
    definition: "v. 增强，提高",
    example: "Reading enhances comprehension.",
    exampleTranslation: "阅读能提高理解力。",
  },
  comprehension: {
    word: "comprehension",
    phonetic: "/ˌkɑːmprɪˈhenʃən/",
    definition: "n. 理解力",
    example: "Reading improves comprehension.",
    exampleTranslation: "阅读能提高理解力。",
  },
  expand: {
    word: "expand",
    phonetic: "/ɪkˈspænd/",
    definition: "v. 扩展，扩大",
    example: "Reading expands your understanding.",
    exampleTranslation: "阅读能扩展你的理解。",
  },
  understanding: {
    word: "understanding",
    phonetic: "/ˌʌndərˈstændɪŋ/",
    definition: "n. 理解，了解",
    example: "Reading expands your understanding.",
    exampleTranslation: "阅读能扩展你的理解。",
  },
  transport: {
    word: "transport",
    phonetic: "/ˈtrænspɔːrt/",
    definition: "v. 运输",
    example: "Books can transport you to different places.",
    exampleTranslation: "书籍可以带你到不同的地方。",
  },
  different: {
    word: "different",
    phonetic: "/ˈdɪfərənt/",
    definition: "adj. 不同的",
    example: "We have different opinions.",
    exampleTranslation: "我们有不同的意见。",
  },
  place: {
    word: "place",
    phonetic: "/pleɪs/",
    definition: "n. 地方",
    example: "This is a nice place.",
    exampleTranslation: "这是一个好地方。",
  },
  places: {
    word: "places",
    phonetic: "/pleɪsɪz/",
    definition: "n. 地方（复数）",
    example: "Books transport you to different places.",
    exampleTranslation: "书籍可以带你到不同的地方。",
  },
  time: {
    word: "time",
    phonetic: "/taɪm/",
    definition: "n. 时间",
    example: "Time flies.",
    exampleTranslation: "时光飞逝。",
  },
  times: {
    word: "times",
    phonetic: "/taɪmz/",
    definition: "n. 时间（复数），时代",
    example: "Books transport you to different times.",
    exampleTranslation: "书籍可以带你到不同的时代。",
  },
};

export async function lookupWord(word: string, context?: string): Promise<DictionaryResult | null> {
  return await fetchWordDefinition(word, context);
}

export async function fetchWordDefinition(word: string, context?: string): Promise<DictionaryResult | null> {
  // 1. FAST PATH: Check local dict
  const localResult = lookupLocal(word);
  if (localResult) {
    console.log("⚡ Instant lookup for:", word);
    return {
      word: localResult.text,
      definition: localResult.definition,
      phonetic: localResult.phonetic,
      tags: localResult.tags,
      example: localResult.example,
      exampleTranslation: localResult.translation,
      isAiGenerated: false
    };
  }

  const lowerWord = word.toLowerCase().trim();
  
  // 1.5 FAST PATH (Legacy): Check mock dictionary
  // 优先尝试精确匹配（保留空格，适用于短语）
  if (mockDictionary[lowerWord]) {
    console.log("⚡ Instant lookup for (legacy):", word);
    const result = { ...mockDictionary[lowerWord] };
    if (!result.exampleTranslation && result.example) {
      result.exampleTranslation = getExampleTranslation(result.example);
    }
    return result;
  }

  // 尝试移除标点符号后的匹配（适用于带标点的单词）
  const normalizedWord = lowerWord.replace(/[^\w]/g, "");
  
  if (mockDictionary[normalizedWord]) {
    console.log("⚡ Instant lookup for (legacy normalized):", normalizedWord);
    const result = { ...mockDictionary[normalizedWord] };
    if (!result.exampleTranslation && result.example) {
      result.exampleTranslation = getExampleTranslation(result.example);
    }
    return result;
  }

  // 2. SLOW PATH: Call DeepSeek AI
  console.log("🐢 Fetching AI definition for:", word);
  try {
    const aiResult = await lookupWordAI(word, context);
    if (aiResult) return aiResult;
  } catch (e) {
    console.error("AI lookup failed", e);
  }

  // 3. FALLBACK: Free Dictionary API
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${normalizedWord}`
    );
    if (response.ok) {
      const data = await response.json();
      if (data && data[0]) {
        const entry = data[0];
        const meaning = entry.meanings?.[0];
        const englishDefinition = meaning?.definitions?.[0]?.definition || "未找到释义";
        
        const example = meaning?.definitions?.[0]?.example;
        return {
          word: entry.word || normalizedWord,
          phonetic: entry.phonetic || entry.phonetics?.[0]?.text,
          definition: `[英文释义] ${englishDefinition}`,
          example: example,
          exampleTranslation: example ? getExampleTranslation(example) : undefined,
        };
      }
    }
  } catch (error) {
    console.error("Dictionary API error:", error);
  }

  // Fallback for unknown words
  return {
    word: normalizedWord,
    definition: "未找到释义",
  };
}

// 句子翻译映射表（常见句子）
const sentenceTranslations: Record<string, string> = {
  "Artificial intelligence is transforming the way we live and work.": "人工智能正在改变我们的生活方式和工作方式。",
  "Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy.": "机器学习算法现在可以处理大量数据，并以惊人的准确性进行预测。",
  "The applications of AI are endless, from healthcare to transportation, from education to entertainment.": "人工智能的应用是无穷无尽的，从医疗保健到交通运输，从教育到娱乐。",
  "Climate change is one of the most pressing issues of our time.": "气候变化是我们这个时代最紧迫的问题之一。",
  "Rising global temperatures are causing sea levels to rise, weather patterns to shift, and ecosystems to change.": "全球气温上升正在导致海平面上升、天气模式转变和生态系统变化。",
  "Scientists around the world are working to understand these changes and develop solutions.": "世界各地的科学家正在努力理解这些变化并开发解决方案。",
  "Reading is a fundamental skill that opens doors to knowledge and imagination.": "阅读是一项基本技能，为知识和想象力打开大门。",
  "When you read regularly, you improve your vocabulary, enhance your comprehension skills, and expand your understanding of the world.": "当你定期阅读时，你会提高词汇量，增强理解能力，并扩展对世界的理解。",
  "Books can transport you to different places and times.": "书籍可以带你到不同的地方和时代。",
  // 示例文章中的句子
  "Artificial intelligence is transforming the way we live and work": "人工智能正在改变我们的生活方式和工作方式",
  "Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy": "机器学习算法现在可以处理大量数据，并以惊人的准确性进行预测",
  "The applications of AI are endless, from healthcare to transportation, from education to entertainment": "人工智能的应用是无穷无尽的，从医疗保健到交通运输，从教育到娱乐",
  "Climate change is one of the most pressing issues of our time": "气候变化是我们这个时代最紧迫的问题之一",
  "Rising global temperatures are causing sea levels to rise, weather patterns to shift, and ecosystems to change": "全球气温上升正在导致海平面上升、天气模式转变和生态系统变化",
  "Scientists around the world are working to understand these changes and develop solutions": "世界各地的科学家正在努力理解这些变化并开发解决方案",
  "Reading is a fundamental skill that opens doors to knowledge and imagination": "阅读是一项基本技能，为知识和想象力打开大门",
  "When you read regularly, you improve your vocabulary, enhance your comprehension skills, and expand your understanding of the world": "当你定期阅读时，你会提高词汇量，增强理解能力，并扩展对世界的理解",
  "Books can transport you to different places and times": "书籍可以带你到不同的地方和时代",
};

// 获取句子翻译
function translateSentence(sentence: string): string | null {
  const trimmed = sentence.trim();
  // 精确匹配
  if (sentenceTranslations[trimmed]) {
    return sentenceTranslations[trimmed];
  }
  // 尝试匹配（忽略大小写和标点）
  const normalized = trimmed.toLowerCase().replace(/[.,!?;:]/g, "");
  for (const [key, value] of Object.entries(sentenceTranslations)) {
    const normalizedKey = key.toLowerCase().replace(/[.,!?;:]/g, "");
    if (normalizedKey === normalized) {
      return value;
    }
  }
  return null;
}

export function analyzeSentence(sentence: string): { analysis: string; translation: string | null } {
  // 获取句子翻译
  const translation = translateSentence(sentence);
  
  try {
    // 使用compromise进行真实的语法分析
    const doc = nlp(sentence);
    
    // 提取主语、谓语、宾语
    const subjects = doc.match('#Noun+').out('array');
    const verbs = doc.match('#Verb+').out('array');
    const objects = doc.match('#Noun+').not('#Pronoun').out('array');
    
    // 提取从句
    const clauses = doc.clauses().out('array');
    
    // 提取词性标注
    const terms = doc.terms().out('terms');
    const posAnalysis = terms.map((term: any) => 
      `${term.text} (${term.tags.join(', ')})`
    ).join(' | ');
    
    const analysis = `句子结构分析（使用compromise NLP库）：\n\n` +
      `📖 主语: ${subjects.length > 0 ? subjects.join(', ') : '未识别到明确主语'}\n` +
      `🏃 谓语: ${verbs.length > 0 ? verbs.join(', ') : '未识别到明确谓语'}\n` +
      `🎯 宾语: ${objects.length > 0 ? objects.join(', ') : '未识别到明确宾语'}\n\n` +
      `🔍 从句分析: ${clauses.length > 0 ? clauses.join(' | ') : '无从句结构'}\n\n` +
      `🏷️ 词性标注:\n${posAnalysis}\n\n` +
      `💡 说明：这是基于compromise NLP库的真实语法分析，完全离线运行。`;
    
    return {
      analysis,
      translation,
    };
  } catch (error) {
    console.error("语法分析错误:", error);
    // 出错时返回模拟分析
    const words = sentence.trim().split(/\s+/);
    const subject = words[0] || "未知";
    const verb = words.length > 1 ? words[1] : "未知";
    const object = words.length > 2 ? words.slice(2).join(" ") : "无";
    
    const analysis = `句子结构分析（备用模式）：\n\n主语: ${subject}\n谓语: ${verb}\n宾语: ${object}\n\n说明：compromise分析失败，使用简单分析。`;
    
    return {
      analysis,
      translation,
    };
  }
}
