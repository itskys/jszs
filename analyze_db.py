import json
import re
from collections import Counter

def load_js_data(filename):
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        match = re.search(r'=\s*(\{.*\});?', content, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        else:
            print("❌ 无法解析文件格式，请确保文件以 const QUESTION_DB = 开头")
            return None
    except Exception as e:
        print(f"❌ 读取文件出错: {e}")
        return None

def clean_answer(ans):
    if not isinstance(ans, str): return str(ans)
    cleaned = re.sub(r'[\s,\.、，。]', '', ans).upper()
    if re.match(r'^[A-Z]+$', cleaned):
        return "".join(sorted(cleaned))
    return cleaned

def analyze_single(data):
    print("\n" + "="*30)
    print("📋 一、单选题统计")
    print("="*30)
    questions = data.get('single', [])
    total = len(questions)
    print(f"题目总数：{total}")
    if total == 0: return
    answers = [clean_answer(q['answer']) for q in questions]
    counts = Counter(answers)
    for key in sorted(counts.keys()):
        count = counts[key]
        percent = (count / total) * 100
        print(f"[{key}]:\t{count} 题\t({percent:.2f}%)")

def analyze_anomalies(data):
    print("\n" + "="*30)
    print("🕵️ 特异性/异常题目检测")
    print("="*30)
    
    questions = data.get('multi', [])
    fake_multi = 0
    hard_multi = 0
    total_long = 0
    
    for q in questions:
        ans = clean_answer(q['answer'])
        opts = q.get('options', [])
        
        # 1. 伪多选题
        if len(ans) == 1:
            fake_multi += 1
            
        # 2. 长选项陷阱
        if len(opts) >= 5:
            total_long += 1
            if len(ans) < len(opts):
                hard_multi += 1
                
    print(f"伪多选题 (答案只有1个选项): {fake_multi} 题")
    if total_long > 0:
        print(f"长选项陷阱 (选项>=5且非全选): {hard_multi} 题 (占比 {hard_multi/total_long:.2%})")
    else:
        print("长选项陷阱: 无长选项题目")

def analyze_multi(data):
    print("\n" + "="*30)
    print("📋 二、多选题答案组合分布")
    print("="*30)
    questions = data.get('multi', [])
    total = len(questions)
    print(f"题目总数：{total}")
    if total == 0: return

    answers = [clean_answer(q['answer']) for q in questions]
    counts = Counter(answers)
    
    print(f"共发现 {len(counts)} 种答案组合：")
    # 按频率倒序
    for ans, count in counts.most_common():
        percent = (count / total) * 100
        print(f"[{ans}]\t{count} 题\t({percent:.2f}%)")

def analyze_tf(data):
    print("\n" + "="*30)
    print("📋 三、判断题统计")
    print("="*30)
    questions = data.get('tf', [])
    total = len(questions)
    print(f"题目总数：{total}")
    if total == 0: return
    answers = [clean_answer(q['answer']) for q in questions]
    counts = Counter(answers)
    for key, count in counts.most_common():
        percent = (count / total) * 100
        print(f"[{key}]:\t{count} 题\t({percent:.2f}%)")

def main():
    filename = 'questions_data.js'
    print(f"正在分析文件: {filename} ...")
    data = load_js_data(filename)
    if data:
        analyze_single(data)
        analyze_multi(data)
        analyze_anomalies(data) # 新增特异性分析
        analyze_tf(data)
        print("\n" + "="*30)
        print("✅ 分析完成")

if __name__ == "__main__":
    main()