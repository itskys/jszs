import os
import hashlib
import json
import re
import random
try:
    from docx import Document
except ImportError:
    print("请安装依赖: pip install python-docx")
    exit()

# 配置
INPUT_DIR = './2025tk'
OUTPUT_FILE = 'questions_data.js'

# 正则预编译
RE_OPTION = re.compile(r'^\s*\(?([A-F])\)?[、\.．\s]\s*(.*)', re.IGNORECASE)
RE_ANSWER = re.compile(r'^\s*(?:正确)?答案[:：]\s*(.*)', re.IGNORECASE)
RE_ANALYSIS = re.compile(r'^\s*(?:答案)?解析[:：]\s*(.*)', re.IGNORECASE)
RE_CHAPTER_IN_ANA = re.compile(r'(?:<br>|[\s\n])*(所在章节[:：].*)')

def normalize_text(text):
    """文本标准化：去除标点符号和空白，用于指纹计算"""
    if not text: return ""
    text = re.sub(r'<[^>]+>', '', text) # 去除HTML
    return re.sub(r'[^\w\u4e00-\u9fa5]', '', text).strip() # 仅保留汉字数字字母

def clean_answer(ans):
    """清洗答案"""
    if not ans: return ""
    ans = ans.strip().upper()
    # 处理判断题
    if ans in ['√', 'T', 'Y', 'TRUE', '正确']: return '正确'
    if ans in ['×', 'F', 'N', 'FALSE', '错误']: return '错误'
    # 处理选择题 (如 "A B" -> "AB")
    valid = [c for c in ans if c in "ABCDEF"]
    return "".join(valid)

def infer_type(filename, text_content):
    """根据文件名或内容推断题型"""
    if '多选' in filename: return 'multi'
    if '单选' in filename: return 'single'
    if '判断' in filename: return 'tf'
    return 'unknown'

def parse_docx(file_path):
    print(f"正在解析: {os.path.basename(file_path)}")
    try:
        doc = Document(file_path)
    except:
        print(f"❌ 无法读取 {file_path}，请确保是 .docx 格式")
        return []

    questions = []
    curr = None
    collecting_txt = False
    
    # 文件名推断类型
    f_type = infer_type(os.path.basename(file_path), "")

    for para in doc.paragraphs:
        line = para.text.strip()
        if not line: continue
        
        # 过滤页眉页脚噪音
        if "题库" in line and "竞赛" in line: continue

        # 1. 匹配答案
        ans_match = RE_ANSWER.match(line)
        if ans_match:
            if curr:
                curr['answer'] = clean_answer(ans_match.group(1))
                collecting_txt = False
            continue
            
        # 2. 匹配解析
        ana_match = RE_ANALYSIS.match(line)
        if ana_match:
            if curr:
                content = ana_match.group(1)
                # 分离章节
                parts = RE_CHAPTER_IN_ANA.split(content)
                if len(parts) > 1:
                    curr['analysis'] = parts[0].strip()
                    curr['chapter'] = parts[1].replace("所在章节：","").strip()
                else:
                    curr['analysis'] = content.strip()
                collecting_txt = False
            continue

        # 3. 匹配选项
        opt_match = RE_OPTION.match(line)
        if opt_match:
            if curr:
                if 'options' not in curr: curr['options'] = []
                curr['options'].append(line)
                collecting_txt = False
            continue

        # 4. 新题目逻辑
        is_new = False
        if curr is None: is_new = True
        elif 'answer' in curr and curr['answer']: 
            questions.append(curr)
            is_new = True
        
        if is_new:
            curr = {
                "id": "", # 稍后生成
                "question": line,
                "options": [],
                "answer": "",
                "analysis": "暂无解析",
                "type": f_type,
                "chapter": ""
            }
            collecting_txt = True
        elif collecting_txt and curr:
            curr['question'] += "<br>" + line

    if curr and 'answer' in curr:
        questions.append(curr)
    
    return questions

def process_and_deduplicate(all_qs):
    db = {"single": [], "multi": [], "tf": []}
    seen = {} # 指纹库
    
    print("正在去重和分类...")
    
    for q in all_qs:
        # 兜底类型修正
        if q['type'] == 'unknown':
            if q['answer'] in ['正确', '错误']: q['type'] = 'tf'
            elif len(q['answer']) > 1: q['type'] = 'multi'
            else: q['type'] = 'single'
            
        # 补全判断题选项
        if q['type'] == 'tf' and not q['options']:
            q['options'] = ["A. 正确", "B. 错误"]

        # 生成指纹 (题干+答案)
        fingerprint = normalize_text(q['question']) + q['answer']
        q_hash = hashlib.md5(fingerprint.encode('utf-8')).hexdigest()
        
        if q_hash in seen:
            old_q = seen[q_hash]
            # 保留信息更全的那个（比如解析更长）
            if len(q['analysis']) > len(old_q['analysis']):
                seen[q_hash] = q
        else:
            seen[q_hash] = q
            
    # 重新归类
    for q_hash, q in seen.items():
        q['id'] = q_hash # 给每个题一个唯一ID
        if q['type'] in db:
            db[q['type']].append(q)
            
    print(f"处理完成! 单选: {len(db['single'])}, 多选: {len(db['multi'])}, 判断: {len(db['tf'])}")
    return db

if __name__ == "__main__":
    raw_data = []
    if not os.path.exists(INPUT_DIR):
        print(f"❌ 找不到 {INPUT_DIR} 文件夹")
    else:
        files = [f for f in os.listdir(INPUT_DIR) if f.endswith('.docx') and not f.startswith('~$')]
        for f in files:
            raw_data.extend(parse_docx(os.path.join(INPUT_DIR, f)))
            
        if raw_data:
            final_db = process_and_deduplicate(raw_data)
            # 写入JS文件
            js_content = f"const QUESTION_DB = {json.dumps(final_db, ensure_ascii=False, indent=2)};"
            with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
                f.write(js_content)
            print(f"✅ 题库已生成: {OUTPUT_FILE}")
        else:
            print("未提取到题目。")