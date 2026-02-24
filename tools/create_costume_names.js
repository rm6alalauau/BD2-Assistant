// Script to create a proper costume_names.json with all languages
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the extracted data (keyed by character names in various languages)
const zhData = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'costume_names_zh.json'), 'utf-8')
);
// Read the English-keyed version
const extractedNames = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'costume_names_extracted.json'), 'utf-8')
);

// English character names for reference
const englishCharacters = [
    'Lathel', 'Justia', 'Scheherazade', 'Gray', 'Rou', 'Olstein', 'Sylvia', 'Rubia',
    'Eclipse', 'Teresse', 'Liatris', 'Alec', 'Seir', 'Celia', 'Anastasia', 'Lecliss',
    'Rafina', 'Elise', 'Helena', 'Eleaneer', 'Angelica', 'Glacia', 'Ventana', 'Diana',
    'Zenith', 'Yuri', 'Dalvi', 'Nartas', 'Granhildr', 'Refithea', 'Loen', 'Roxy',
    'Eris', 'Venaka', 'Nebris', 'Sacred Justia', 'Levia', 'Morpeah', 'Michaela',
    'Yomi', 'Yozakura', 'Hikage', 'Yumi', 'Luvencia', 'Liberta', 'Blade', 'Wilhelmina',
    'Goblin Slayer', 'Priestess', 'High Elf Archer', 'Sword Maiden', 'Olivier', 'Sonya',
    'Tyr', 'Darian', 'Granadair', 'Lisianne', 'Bernie', 'Layla', 'Lucrezia', 'Samay',
    'Kry', 'Jayden', 'Andrew', 'Elpis', 'Fred', 'Gynt', 'Remnunt', 'Maria', 'Arines',
    'Emma', 'Ingrid', 'Cynthia', 'Julie', 'Carlson', 'Lydia', 'Rigenette', 'Beatrice', 'Wiggle'
];

// Character name mappings for different languages
// Format: { English: { 'zh-TW': '繁體', 'zh-CN': '簡體', 'ko': '韓文', 'ja': '日文' } }
const charNameMappings = {
    'Lathel': { 'zh-TW': '拉德爾', 'zh-CN': '拉德尔', 'ko': '라텔', 'ja': 'ラテル' },
    'Justia': { 'zh-TW': '悠絲緹亞', 'zh-CN': '悠丝缇亚', 'ko': '유스티아', 'ja': 'ユースティア' },
    'Scheherazade': { 'zh-TW': '莎赫拉查德', 'zh-CN': '莎赫拉查德', 'ko': '세헤라자드', 'ja': 'シェラザード' },
    'Gray': { 'zh-TW': '格雷', 'zh-CN': '格雷', 'ko': '그레이', 'ja': 'グレイ' },
    'Rou': { 'zh-TW': '魯', 'zh-CN': '鲁', 'ko': '루', 'ja': 'ルゥ' },
    'Olstein': { 'zh-TW': '奧爾施塔因', 'zh-CN': '奥尔施塔因', 'ko': '올슈타인', 'ja': 'オルシュタイン' },
    'Sylvia': { 'zh-TW': '席比雅', 'zh-CN': '席比雅', 'ko': '실비아', 'ja': 'シルヴィア' },
    'Rubia': { 'zh-TW': '露比雅', 'zh-CN': '露比雅', 'ko': '루비아', 'ja': 'ルヴィア' },
    'Eclipse': { 'zh-TW': '伊柯利普斯', 'zh-CN': '伊柯利普斯', 'ko': '이클립스', 'ja': 'エクリプス' },
    'Teresse': { 'zh-TW': '泰瑞絲', 'zh-CN': '泰瑞丝', 'ko': '테레제', 'ja': 'テレーゼ' },
    'Liatris': { 'zh-TW': '莉亞特里斯', 'zh-CN': '莉亚特里斯', 'ko': '리아트리스', 'ja': 'リアトリス' },
    'Alec': { 'zh-TW': '艾瑞克', 'zh-CN': '艾瑞克', 'ko': '알렉', 'ja': 'アレック' },
    'Seir': { 'zh-TW': '賽爾', 'zh-CN': '赛尔', 'ko': '세이르', 'ja': 'セイル' },
    'Celia': { 'zh-TW': '西利亞', 'zh-CN': '西利亚', 'ko': '셀리아', 'ja': 'セリア' },
    'Anastasia': { 'zh-TW': '安娜塔西亞', 'zh-CN': '安娜塔西亚', 'ko': '아나스타샤', 'ja': 'アナスタシア' },
    'Lecliss': { 'zh-TW': '萊克莉斯', 'zh-CN': '莱克莉斯', 'ko': '레클리스', 'ja': 'レクリス' },
    'Rafina': { 'zh-TW': '拉菲娜', 'zh-CN': '拉菲娜', 'ko': '라피나', 'ja': 'ラフィーナ' },
    'Elise': { 'zh-TW': '愛麗潔', 'zh-CN': '爱丽洁', 'ko': '엘리제', 'ja': 'エリーゼ' },
    'Helena': { 'zh-TW': '海倫娜', 'zh-CN': '海伦娜', 'ko': '헬레나', 'ja': 'ヘレナ' },
    'Eleaneer': { 'zh-TW': '艾尼爾', 'zh-CN': '艾尼尔', 'ko': '에레니르', 'ja': 'エレニール' },
    'Angelica': { 'zh-TW': '安潔莉卡', 'zh-CN': '安洁莉卡', 'ko': '안젤리카', 'ja': 'アンジェリカ' },
    'Glacia': { 'zh-TW': '克蕾西亞', 'zh-CN': '克蕾西亚', 'ko': '글레이시아', 'ja': 'グレイシア' },
    'Ventana': { 'zh-TW': '班塔納', 'zh-CN': '班塔纳', 'ko': '벤타나', 'ja': 'ヴェンタナ' },
    'Diana': { 'zh-TW': '黛安娜', 'zh-CN': '黛安娜', 'ko': '디아나', 'ja': 'ディアナ' },
    'Zenith': { 'zh-TW': '傑尼斯', 'zh-CN': '杰尼斯', 'ko': '제니스', 'ja': 'ジェニス' },
    'Yuri': { 'zh-TW': '尤里', 'zh-CN': '尤里', 'ko': '유리', 'ja': 'ユリ' },
    'Dalvi': { 'zh-TW': '達非', 'zh-CN': '达非', 'ko': '달비', 'ja': 'キュウビ' },
    'Nartas': { 'zh-TW': '納羅達斯', 'zh-CN': '纳罗达斯', 'ko': '나르타스', 'ja': 'ナルタス' },
    'Granhildr': { 'zh-TW': '葛蘭西特', 'zh-CN': '格兰希特', 'ko': '그란힐트', 'ja': 'グランヒルト' },
    'Refithea': { 'zh-TW': '芮彼泰雅', 'zh-CN': '芮彼泰雅', 'ko': '레피테아', 'ja': 'レピテア' },
    'Loen': { 'zh-TW': '羅安', 'zh-CN': '罗安', 'ko': '로엔', 'ja': 'ロエン' },
    'Roxy': { 'zh-TW': '洛琪希', 'zh-CN': '洛琪希', 'ko': '록시', 'ja': 'ロキシー' },
    'Eris': { 'zh-TW': '艾莉絲', 'zh-CN': '艾莉丝', 'ko': '에리스', 'ja': 'エリス' },
    'Venaka': { 'zh-TW': '貝那卡', 'zh-CN': '贝那卡', 'ko': '베나카', 'ja': 'ベナカ' },
    'Nebris': { 'zh-TW': '內布利斯', 'zh-CN': '内布利斯', 'ko': '네브리스', 'ja': 'ネブリス' },
    'Sacred Justia': { 'zh-TW': '神聖悠絲緹亞', 'zh-CN': '神圣悠丝缇亚', 'ko': '신성 유스티아', 'ja': '神聖ユースティア' },
    'Levia': { 'zh-TW': '萊維亞', 'zh-CN': '莱维亚', 'ko': '레비아', 'ja': 'レヴィア' },
    'Morpeah': { 'zh-TW': '墨菲亞', 'zh-CN': '墨菲亚', 'ko': '모르페아', 'ja': 'モルフェア' },
    'Michaela': { 'zh-TW': '米卡埃拉', 'zh-CN': '米卡艾拉', 'ko': '미카엘라', 'ja': 'ミカエラ' },
    'Yomi': { 'zh-TW': '詠', 'zh-CN': '咏', 'ko': '요미', 'ja': '詠' },
    'Yozakura': { 'zh-TW': '夜櫻', 'zh-CN': '夜樱', 'ko': '요자쿠라', 'ja': '夜桜' },
    'Hikage': { 'zh-TW': '日影', 'zh-CN': '日影', 'ko': '히카게', 'ja': '日影' },
    'Yumi': { 'zh-TW': '雪泉', 'zh-CN': '雪泉', 'ko': '유미', 'ja': '雪泉' },
    'Luvencia': { 'zh-TW': '盧班希亞', 'zh-CN': '卢班希亚', 'ko': '루벤시아', 'ja': 'ルベンシア' },
    'Liberta': { 'zh-TW': '黎維塔', 'zh-CN': '黎维塔', 'ko': '리베르타', 'ja': 'リベルタ' },
    'Blade': { 'zh-TW': '布萊德', 'zh-CN': '布莱德', 'ko': '블레이드', 'ja': 'ブレイド' },
    'Wilhelmina': { 'zh-TW': '威廉明娜', 'zh-CN': '威廉明娜', 'ko': '빌헬미나', 'ja': 'ウィルヘルミナ' },
    'Goblin Slayer': { 'zh-TW': '哥布林殺手', 'zh-CN': '哥布林杀手', 'ko': '고블린 슬레이어', 'ja': 'ゴブリンスレイヤー' },
    'Priestess': { 'zh-TW': '女神官', 'zh-CN': '女神官', 'ko': '여신관', 'ja': '女神官' },
    'High Elf Archer': { 'zh-TW': '妖精弓手', 'zh-CN': '妖精弓手', 'ko': '엘프 궁수', 'ja': '妖精弓手' },
    'Sword Maiden': { 'zh-TW': '劍之聖女', 'zh-CN': '剑之圣女', 'ko': '검의 처녀', 'ja': '剣の乙女' },
    'Olivier': { 'zh-TW': '奧利維爾', 'zh-CN': '奥利维耶', 'ko': '올리비에', 'ja': 'オリビエ' },
    'Sonya': { 'zh-TW': '索妮亞', 'zh-CN': '索尼娅', 'ko': '소냐', 'ja': 'ソーニャ' },
    'Tyr': { 'zh-TW': '提爾', 'zh-CN': '提尔', 'ko': '티르', 'ja': 'ティル' },
    'Darian': { 'zh-TW': '達麗安', 'zh-CN': '达丽安', 'ko': '다리안', 'ja': 'ダリアン' },
    'Granadair': { 'zh-TW': '葛拉娜德', 'zh-CN': '葛拉娜德', 'ko': '그라나데', 'ja': 'グラナデ' },
    'Lisianne': { 'zh-TW': '莉西安', 'zh-CN': '莉西安', 'ko': '리시안느', 'ja': 'リシアンヌ' },
    'Bernie': { 'zh-TW': '維爾尼', 'zh-CN': '维尔尼', 'ko': '베르니', 'ja': 'ベルニー' },
    'Layla': { 'zh-TW': '蕾拉', 'zh-CN': '蕾拉', 'ko': '레일라', 'ja': 'レイラ' },
    'Lucrezia': { 'zh-TW': '盧克雷齊亞', 'zh-CN': '卢克雷齐亚', 'ko': '루크레치아', 'ja': 'ルクレチア' },
    'Samay': { 'zh-TW': '莎美', 'zh-CN': '莎美', 'ko': '사메이', 'ja': 'サメイ' },
    'Kry': { 'zh-TW': '克萊', 'zh-CN': '克莱', 'ko': '크라이', 'ja': 'クライ' },
    'Jayden': { 'zh-TW': '傑登', 'zh-CN': '杰登', 'ko': '제이든', 'ja': 'ジェイデン' },
    'Andrew': { 'zh-TW': '安德魯', 'zh-CN': '安德鲁', 'ko': '앤드류', 'ja': 'アンドリュー' },
    'Elpis': { 'zh-TW': '厄爾比斯', 'zh-CN': '厄尔比斯', 'ko': '엘피스', 'ja': 'エルピス' },
    'Fred': { 'zh-TW': '弗雷德', 'zh-CN': '弗雷德', 'ko': '프레드', 'ja': 'フレッド' },
    'Gynt': { 'zh-TW': '君特', 'zh-CN': '君特', 'ko': '귄트', 'ja': 'ギュント' },
    'Remnunt': { 'zh-TW': '雷南特', 'zh-CN': '雷南特', 'ko': '램넌트', 'ja': 'レムナント' },
    'Maria': { 'zh-TW': '瑪麗亞', 'zh-CN': '玛丽亚', 'ko': '마리아', 'ja': 'マリア' },
    'Arines': { 'zh-TW': '阿里內斯', 'zh-CN': '阿里内斯', 'ko': '아리네스', 'ja': 'アリネス' },
    'Emma': { 'zh-TW': '艾瑪', 'zh-CN': '艾玛', 'ko': '엠마', 'ja': 'エマ' },
    'Ingrid': { 'zh-TW': '英格利得', 'zh-CN': '英格利得', 'ko': '잉그리드', 'ja': 'イングリッド' },
    'Cynthia': { 'zh-TW': '辛西亞', 'zh-CN': '辛西亚', 'ko': '신시아', 'ja': 'シンシア' },
    'Julie': { 'zh-TW': '茱莉', 'zh-CN': '茱莉', 'ko': '줄리', 'ja': 'ジュリー' },
    'Carlson': { 'zh-TW': '卡森', 'zh-CN': '卡森', 'ko': '칼슨', 'ja': 'カーソン' },
    'Lydia': { 'zh-TW': '黎迪雅', 'zh-CN': '黎迪雅', 'ko': '리디아', 'ja': 'リディア' },
    'Rigenette': { 'zh-TW': '莉茲內', 'zh-CN': '莉兹内', 'ko': '리즈넷', 'ja': 'リジー' },
    'Beatrice': { 'zh-TW': '比阿特麗絲', 'zh-CN': '比阿特丽丝', 'ko': '베아트리체', 'ja': 'ベアトリス' },
    'Wiggle': { 'zh-TW': '威格', 'zh-CN': '威格', 'ko': '위글', 'ja': 'ウィグル' }
};

// Simplified to Traditional Chinese character mapping for common costume name characters
const simplifiedToTraditional = {
    '药': '藥', '猎': '獵', '将': '將', '帅': '帥', '师': '師', '护': '護',
    '苍': '蒼', '蓝': '藍', '术': '術', '学': '學', '号': '號',
    '头': '頭', '队': '隊', '长': '長', '军': '軍', '剑': '劍', '后': '後',
    '将': '將', '级': '級', '锋': '鋒', '务': '務', '仆': '僕', '对': '對',
    '师': '師', '马': '馬', '鸟': '鳥', '鱼': '魚', '龙': '龍',
    '风': '風', '云': '雲', '电': '電', '门': '門', '书': '書', '画': '畫',
    '话': '話', '语': '語', '说': '說', '读': '讀', '认': '認', '让': '讓',
    '计': '計', '记': '記', '设': '設', '证': '證', '评': '評', '词': '詞',
    '识': '識', '变': '變', '奥': '奧', '尔': '爾', '历': '歷', '厂': '廠',
    '万': '萬', '与': '與', '专': '專', '业': '業', '东': '東', '丝': '絲',
    '两': '兩', '严': '嚴', '丽': '麗', '个': '個', '临': '臨', '为': '為',
    '举': '舉', '义': '義', '乐': '樂', '买': '買', '乱': '亂', '亚': '亞',
    '从': '從', '传': '傳', '伟': '偉', '优': '優', '会': '會', '体': '體',
    '余': '餘', '养': '養', '兴': '興', '关': '關', '兽': '獸', '内': '內',
    '农': '農', '凤': '鳳', '凯': '凱', '击': '擊', '创': '創', '别': '別',
    '则': '則', '刚': '剛', '动': '動', '办': '辦', '协': '協', '卫': '衛',
    '却': '卻', '压': '壓', '厅': '廳', '参': '參', '双': '雙', '发': '發',
    '叶': '葉', '只': '隻', '员': '員', '听': '聽', '启': '啟', '响': '響',
    '园': '園', '围': '圍', '图': '圖', '团': '團', '国': '國', '圣': '聖',
    '场': '場', '坏': '壞', '坚': '堅', '块': '塊', '报': '報', '声': '聲',
    '处': '處', '备': '備', '复': '復', '够': '夠', '夺': '奪', '奋': '奮',
    '夸': '誇', '妇': '婦', '妈': '媽', '孙': '孫', '宁': '寧', '宝': '寶',
    '实': '實', '宠': '寵', '审': '審', '宪': '憲', '宾': '賓', '导': '導',
    '尝': '嘗', '尽': '盡', '层': '層', '属': '屬', '岁': '歲', '岛': '島',
    '币': '幣', '帅': '帥', '带': '帶', '帮': '幫', '广': '廣', '庆': '慶',
    '应': '應', '废': '廢', '开': '開', '异': '異', '张': '張', '归': '歸',
    '当': '當', '录': '錄', '彻': '徹', '忆': '憶', '怀': '懷', '态': '態',
    '总': '總', '恶': '惡', '悦': '悅', '惊': '驚', '惧': '懼', '惨': '慘',
    '惯': '慣', '愤': '憤', '愿': '願', '戏': '戲', '战': '戰', '户': '戶',
    '扑': '撲', '执': '執', '扩': '擴', '扫': '掃', '扬': '揚', '抚': '撫',
    '抢': '搶', '择': '擇', '担': '擔', '拟': '擬', '拥': '擁', '挥': '揮',
    '挤': '擠', '捡': '撿', '据': '據', '摇': '搖', '摆': '擺', '携': '攜',
    '数': '數', '斗': '鬥', '无': '無', '旧': '舊', '时': '時', '显': '顯',
    '晓': '曉', '暂': '暫', '杂': '雜', '权': '權', '条': '條', '来': '來',
    '极': '極', '构': '構', '标': '標', '样': '樣', '检': '檢', '楼': '樓',
    '机': '機', '杀': '殺', '杰': '傑', '枪': '槍', '树': '樹', '档': '檔',
    '欢': '歡', '欧': '歐', '毕': '畢', '气': '氣', '没': '沒', '沟': '溝',
    '泽': '澤', '洁': '潔', '浅': '淺', '测': '測', '济': '濟', '浑': '渾',
    '浓': '濃', '涂': '塗', '涛': '濤', '润': '潤', '涨': '漲', '渐': '漸',
    '渔': '漁', '温': '溫', '游': '遊', '湾': '灣', '湿': '濕', '溃': '潰',
    '滚': '滾', '满': '滿', '滥': '濫', '滨': '濱', '潜': '潛', '灭': '滅',
    '灯': '燈', '灵': '靈', '灿': '燦', '炉': '爐', '烂': '爛', '烟': '煙',
    '烧': '燒', '热': '熱', '爱': '愛', '爷': '爺', '牵': '牽', '独': '獨',
    '狭': '狹', '猪': '豬', '献': '獻', '玛': '瑪', '环': '環', '现': '現',
    '画': '畫', '畅': '暢', '疗': '療', '盖': '蓋', '盘': '盤', '监': '監',
    '盐': '鹽', '目': '目', '省': '省', '睁': '睜', '矿': '礦', '码': '碼',
    '砖': '磚', '确': '確', '礼': '禮', '祥': '祥', '禁': '禁', '离': '離',
    '种': '種', '积': '積', '称': '稱', '税': '稅', '稳': '穩', '穷': '窮',
    '窃': '竊', '窗': '窗', '竞': '競', '笔': '筆', '笼': '籠', '签': '簽',
    '简': '簡', '类': '類', '粮': '糧', '紧': '緊', '红': '紅', '纪': '紀',
    '约': '約', '纯': '純', '纲': '綱', '纳': '納', '纵': '縱', '纷': '紛',
    '纸': '紙', '纹': '紋', '线': '線', '终': '終', '组': '組', '细': '細',
    '织': '織', '经': '經', '结': '結', '绕': '繞', '绘': '繪', '给': '給',
    '络': '絡', '绝': '絕', '统': '統', '继': '繼', '绩': '績', '绪': '緒',
    '续': '續', '维': '維', '绵': '綿', '综': '綜', '缓': '緩', '编': '編',
    '缘': '緣', '缠': '纏', '缩': '縮', '缴': '繳', '罚': '罰', '罢': '罷',
    '职': '職', '联': '聯', '聘': '聘', '肃': '肅', '胜': '勝', '脉': '脈',
    '脏': '臟', '舰': '艦', '艳': '艷', '艺': '藝', '节': '節', '范': '範',
    '茧': '繭', '荐': '薦', '荡': '蕩', '营': '營', '落': '落', '葱': '蔥',
    '虑': '慮', '虚': '虛', '蛮': '蠻', '补': '補', '装': '裝', '观': '觀',
    '规': '規', '视': '視', '览': '覽', '觉': '覺', '触': '觸', '誉': '譽',
    '计': '計', '讨': '討', '讲': '講', '许': '許', '该': '該', '详': '詳',
    '误': '誤', '请': '請', '诸': '諸', '诺': '諾', '课': '課', '谁': '誰',
    '调': '調', '谈': '談', '谊': '誼', '谋': '謀', '谓': '謂', '谜': '謎',
    '谨': '謹', '豪': '豪', '贝': '貝', '贞': '貞', '负': '負', '贡': '貢',
    '财': '財', '贩': '販', '贪': '貪', '贫': '貧', '购': '購', '贯': '貫',
    '贱': '賤', '贴': '貼', '贵': '貴', '贷': '貸', '贺': '賀', '费': '費',
    '贼': '賊', '资': '資', '赋': '賦', '赌': '賭', '赏': '賞', '赐': '賜',
    '赔': '賠', '赖': '賴', '赛': '賽', '赞': '贊', '赵': '趙', '趋': '趨',
    '跃': '躍', '践': '踐', '踪': '蹤', '躯': '軀', '车': '車', '轨': '軌',
    '轩': '軒', '转': '轉', '轮': '輪', '软': '軟', '轰': '轟', '轴': '軸',
    '载': '載', '轻': '輕', '较': '較', '辅': '輔', '辆': '輛', '辉': '輝',
    '输': '輸', '辑': '輯', '辞': '辭', '辩': '辯', '边': '邊', '达': '達',
    '迁': '遷', '过': '過', '迈': '邁', '运': '運', '进': '進', '远': '遠',
    '违': '違', '连': '連', '迟': '遲', '选': '選', '递': '遞', '遗': '遺',
    '邮': '郵', '邻': '鄰', '酝': '醞', '酿': '釀', '释': '釋', '针': '針',
    '钉': '釘', '钓': '釣', '钢': '鋼', '钩': '鉤', '钱': '錢', '钻': '鑽',
    '铁': '鐵', '铃': '鈴', '铅': '鉛', '银': '銀', '铜': '銅', '铝': '鋁',
    '铺': '鋪', '链': '鏈', '销': '銷', '锁': '鎖', '锅': '鍋', '锐': '銳',
    '错': '錯', '锡': '錫', '锣': '鑼', '锤': '錘', '锦': '錦', '键': '鍵',
    '锻': '鍛', '镇': '鎮', '镜': '鏡', '镶': '鑲', '闭': '閉', '问': '問',
    '闯': '闖', '闲': '閒', '间': '間', '闷': '悶', '闸': '閘', '闹': '鬧',
    '阅': '閱', '阔': '闊', '阳': '陽', '阴': '陰', '阵': '陣', '阶': '階',
    '际': '際', '陆': '陸', '陈': '陳', '险': '險', '随': '隨', '隐': '隱',
    '隶': '隸', '雇': '僱', '雏': '雛', '雳': '靂', '雾': '霧', '韩': '韓',
    '顶': '頂', '项': '項', '顺': '順', '须': '須', '顷': '頃', '预': '預',
    '顽': '頑', '顾': '顧', '颁': '頒', '颂': '頌', '颇': '頗', '颈': '頸',
    '颊': '頰', '频': '頻', '题': '題', '颜': '顏', '颠': '顛', '颤': '顫',
    '飘': '飄', '飞': '飛', '饥': '飢', '饰': '飾', '饱': '飽', '饲': '飼',
    '饺': '餃', '饼': '餅', '馆': '館', '馈': '饋', '馒': '饅', '骄': '驕',
    '骆': '駱', '骇': '駭', '验': '驗', '骑': '騎', '骗': '騙', '骚': '騷',
    '骤': '驟', '髅': '髏', '鬼': '鬼', '魂': '魂', '魅': '魅', '魔': '魔',
    '鲁': '魯', '鲜': '鮮', '鲤': '鯉', '鸡': '雞', '鸥': '鷗', '鸣': '鳴',
    '鸭': '鴨', '鸽': '鴿', '鹅': '鵝', '鹰': '鷹', '麦': '麥', '黄': '黃',
    '齐': '齊', '齿': '齒', '咏': '詠', '樱': '櫻', '绮': '綺', '特': '特',
    '工': '工', '派': '派', '党': '黨', '泳': '泳', '池': '池', '党': '黨',
    '女': '女', '帝': '帝', '基': '基', '尼': '尼', '雪': '雪', '泉': '泉'
};

// Convert Simplified Chinese to Traditional Chinese
function simplifiedToTraditionalChinese(text) {
    if (!text) return text;
    let result = '';
    for (const char of text) {
        result += simplifiedToTraditional[char] || char;
    }
    return result;
}

// Create costume translations structure
// Format: { "CharacterEnglishName": { "CostumeEnglishName": { "zh-TW": "繁中", "zh-CN": "简中", "ko": "韓文", "ja": "日文" } } }
const costumeTranslations = {};

// Process each English character
for (const enChar of englishCharacters) {
    if (!extractedNames[enChar]) {
        console.log(`Missing English costumes for: ${enChar}`);
        continue;
    }

    const enCostumes = extractedNames[enChar];
    const charMapping = charNameMappings[enChar];

    if (!charMapping) {
        console.log(`No character mapping for: ${enChar}`);
        continue;
    }

    costumeTranslations[enChar] = {};

    // Get localized character names
    const zhTWChar = charMapping['zh-TW'];
    const zhCNChar = charMapping['zh-CN'];
    const koChar = charMapping['ko'];
    const jaChar = charMapping['ja'];

    // Get costumes for each language from zhData
    const zhTWCostumes = zhData[zhTWChar] || [];
    const zhCNCostumes = zhData[zhCNChar] || [];
    const koCostumes = zhData[koChar] || [];
    const jaCostumes = zhData[jaChar] || [];

    // Match costumes by index (assuming same order)
    for (let i = 0; i < enCostumes.length; i++) {
        const enCostume = enCostumes[i];
        // Use zh-CN as the source and convert to zh-TW (since wiki source has mixed zh variants)
        const zhCNCostume = zhCNCostumes[i] || zhTWCostumes[i] || enCostume;
        const zhTWCostume = simplifiedToTraditionalChinese(zhCNCostume);

        costumeTranslations[enChar][enCostume] = {
            'zh-TW': zhTWCostume,
            'zh-CN': zhCNCostume,
            'ko': koCostumes[i] || enCostume,
            'ja': jaCostumes[i] || enCostume
        };
    }
}

// Save the result
const outputPath = path.join(__dirname, '../public/costume_names.json');
fs.writeFileSync(outputPath, JSON.stringify(costumeTranslations, null, 2), 'utf-8');
console.log(`Saved costume translations to: ${outputPath}`);

// Print summary
let totalCostumes = 0;
for (const char of Object.keys(costumeTranslations)) {
    const count = Object.keys(costumeTranslations[char]).length;
    totalCostumes += count;
    console.log(`${char}: ${count} costumes`);
}
console.log(`\nTotal: ${Object.keys(costumeTranslations).length} characters, ${totalCostumes} costumes`);

// Print first character as example
const firstChar = Object.keys(costumeTranslations)[0];
console.log(`\nExample (${firstChar}):`);
console.log(JSON.stringify(costumeTranslations[firstChar], null, 2));
