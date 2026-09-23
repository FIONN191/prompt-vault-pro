// 提示词工坊(Prompt Forge)的模型库:大脑模型、下游任务、各下游模型的 prompt 规范

/* ============ 大脑模型(用于生成 System Prompt 的 LLM/VLM) ============ */

export const BRAIN_MODELS = [
  { id: 'qwen3.5-9b', name: 'Qwen3.5-9B', vendor: 'ALIBABA', tag: '开源·轻量', open: true, vision: false },
  { id: 'qwen3.5-27b', name: 'Qwen3.5-27B', vendor: 'ALIBABA', tag: '开源·主力', open: true, vision: false },
  { id: 'qwen3.6-35b', name: 'Qwen3.6-35B', vendor: 'ALIBABA', tag: '开源·DENSE', open: true, vision: false },
  { id: 'qwen3.6-35b-a3b', name: 'Qwen3.6-35B-A3B', vendor: 'ALIBABA', tag: '开源·MOE', open: true, vision: false },
  { id: 'qwen3.5-vl', name: 'Qwen3.5-VL', vendor: 'ALIBABA', tag: '开源·多模态', open: true, vision: true },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', vendor: 'DEEPSEEK', tag: '开源', open: true, vision: false },
  { id: 'deepseek-r1', name: 'DeepSeek R1', vendor: 'DEEPSEEK', tag: '开源·推理', open: true, vision: false },
  { id: 'glm-4.5-air', name: 'GLM-4.5-Air', vendor: 'ZHIPU', tag: '开源', open: true, vision: false },
  { id: 'mistral-small-3.5', name: 'Mistral Small 3.5', vendor: 'MISTRAL', tag: '开源', open: true, vision: false },
  { id: 'gpt-5.2', name: 'GPT-5.2', vendor: 'OPENAI', tag: '闭源·多模态', open: false, vision: true },
  { id: 'claude-fable-5', name: 'Fable 5', vendor: 'ANTHROPIC', tag: '闭源·多模态', open: false, vision: true },
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', vendor: 'GOOGLE', tag: '闭源·多模态', open: false, vision: true },
]

/* ============ 下游生成任务 ============ */

export const DOWNSTREAM_TASKS = [
  { id: 'none', label: '不下发生成', icon: 'T', desc: '只写大脑 Prompt,不驱动下游模型' },
  { id: 't2i', label: '文生图', icon: '🖼', desc: '输出文生图 prompt(主体/风格/光线/构图/负面词)' },
  { id: 'i2i', label: '图生图', icon: '🖼', desc: '输出图生图 prompt(参考图 + 变化描述)' },
  { id: 'edit', label: '图像编辑', icon: '✎', desc: '输出编辑指令(修改项 + 保持不变项)' },
  { id: 't2v', label: '文生视频', icon: '🎬', desc: '输出含运镜/节奏/时长/首尾帧/音效提示的视频 prompt' },
  { id: 'i2v', label: '图生视频', icon: '🎬', desc: '输出图生视频 prompt(主体动作 + 镜头 + 氛围分层)' },
]

/* ============ 下游具体模型(带各家 prompt 规范) ============
 * schema.lang: 'en' 英文 | 'zh' 中文为主 | 'both' 中英皆可
 * schema.style: 'natural' 自然语言段落 | 'tags' 逗号分隔标签
 * schema.rules: 写进 System Prompt「输出规范」的要点
 */

export const DOWNSTREAM_MODELS = {
  t2i: [
    {
      id: 'z-image', name: 'Z-Image', vendor: '智象 / 开源', tag: '开源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文单段正向 Prompt:主体 → 风格 → 光线 → 构图 → 质量词,自然语言连贯书写', 'Negative prompt 单独一行,以「Negative:」开头', '默认画质词:ultra-detailed, best quality;人像默认 85mm 浅景深'] },
    },
    {
      id: 'z-image-turbo', name: 'Z-Image-Turbo', vendor: '智象 / 开源', tag: '开源·极速',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文精简 Prompt(≤60 词),只保留主体/风格/光线三要素', 'Turbo 蒸馏模型对长 prompt 增益有限,严禁堆砌质量词', 'Negative prompt 单独一行,只写关键排除项'] },
    },
    {
      id: 'qwen-image', name: 'Qwen-Image', vendor: 'ALIBABA', tag: '开源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['支持中文 Prompt,输出中文自然语言段落,可精准控制画面内文字内容', '若画面含文字,用「画面中写着"××"」明确指定', '负面词单独一行,中文即可'] },
    },
    {
      id: 'krea-2', name: 'Krea 2', vendor: 'KREA AI', tag: '开源·实时',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文短 Prompt(≤40 词),实时模型重响应速度', '风格词放最前(style-first),如 "cinematic photo of ..."', '不需要 Negative prompt'] },
    },
    {
      id: 'flux-2', name: 'FLUX.2', vendor: 'BLACK FOREST LABS', tag: '开源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文自然语言长描述,FLUX 对细节描述响应极好', '按「场景总述 → 主体细节 → 环境光线 → 相机参数」推进', '不支持 Negative prompt,排除项用正向改写(如 "clean background")'] },
    },
    {
      id: 'sd-3.5', name: 'Stable Diffusion 3.5', vendor: 'STABILITY', tag: '开源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出「Prompt:」与「Negative prompt:」两段', '正向用自然语言+关键 tag 混合;建议附 CFG 4.5、Steps 28 起步参数', '人像注意加 detailed face, natural skin texture'] },
    },
    {
      id: 'sdxl-1.0', name: 'SDXL 1.0', vendor: 'STABILITY', tag: '开源·经典',
      schema: { lang: 'en', style: 'tags',
        rules: ['输出逗号分隔 tag 风格:质量词 → 主体 → 服饰/细节 → 环境 → 光线 → 镜头', '「Prompt:」与「Negative prompt:」两段;负面词含 worst quality, deformed hands', '可附权重语法 (keyword:1.2) 强调重点'] },
    },
    {
      id: 'hunyuan-dit', name: 'Hunyuan-DiT', vendor: 'TENCENT', tag: '开源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['支持中文 Prompt,输出中文段落,擅长国风/东方美学题材', '负面词单独一行', '国风题材可加「水墨」「工笔」等传统美学词'] },
    },
    {
      id: 'kolors', name: '可图 Kolors', vendor: 'KUAISHOU', tag: '开源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['支持中文 Prompt,中文人像/电商题材表现强', '输出中文段落 + 单行负面词', '电商题材默认附「商业摄影,影棚灯光」'] },
    },
    {
      id: 'midjourney-v7', name: 'Midjourney V7', vendor: 'MIDJOURNEY', tag: '闭源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文短句式 Prompt,句末附参数:--ar 比例 --v 7,负面用 --no', '风格链式书写:主体 :: 风格 :: 光线', '禁用完整语法讲解,直接给可粘贴命令'] },
    },
  ],
  i2i: [
    {
      id: 'nano-banana-i2i', name: 'Nano Banana', vendor: 'GOOGLE / Gemini', tag: '闭源·多模态',
      schema: { lang: 'both', style: 'natural',
        rules: ['输出对参考图的变化指令:先声明保留项,再描述变化项', '用「保持 X 不变,把 Y 改为 Z」句式,指令化而非描述化', '中英文皆可,复杂变换建议英文'] },
    },
    {
      id: 'seedream-4', name: 'Seedream 4 / 即梦', vendor: 'BYTEDANCE', tag: '闭源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文变化描述,即梦对中文语义理解好', '注明参考强度建议(低=构图参考 / 高=风格迁移)', '负面词单独一行'] },
    },
    {
      id: 'flux-redux', name: 'FLUX.2 Redux', vendor: 'BLACK FOREST LABS', tag: '开源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文描述:参考图特征 + 目标变化的融合描述', '明确指定 variation strength 建议值(0.3 微调 / 0.8 重绘)', '排除项用正向改写'] },
    },
    {
      id: 'sdxl-img2img', name: 'SDXL img2img', vendor: 'STABILITY', tag: '开源·经典',
      schema: { lang: 'en', style: 'tags',
        rules: ['输出 tag 风格 Prompt + Negative prompt 两段', '附 denoising strength 建议(0.3-0.5 保结构 / 0.6-0.8 大改)', '负面词含 blurry, artifacts'] },
    },
  ],
  edit: [
    {
      id: 'nano-banana-edit', name: 'Nano Banana / Gemini', vendor: 'GOOGLE', tag: '闭源·多模态',
      schema: { lang: 'both', style: 'natural',
        rules: ['输出编辑指令三段式:①要改什么 ②怎么改 ③什么必须保持逐像素不变', '锁定项要穷举:面部/光照/背景/构图/色调,防止模型顺手改动', '一次只下达一个主编辑意图,复杂编辑拆多轮'] },
    },
    {
      id: 'qwen-image-edit', name: 'Qwen-Image-Edit', vendor: 'ALIBABA', tag: '开源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文编辑指令,支持画面文字的增删改', '用「把 X 改成 Y,其余保持不变」句式', '文字编辑用引号明确目标内容'] },
    },
    {
      id: 'seededit', name: 'SeedEdit / 即梦编辑', vendor: 'BYTEDANCE', tag: '闭源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文单句编辑指令,越短越稳', '强调保留项:「人物和背景保持原样」', '涂抹类编辑注明「仅修改选区内」'] },
    },
    {
      id: 'flux-kontext', name: 'FLUX Kontext', vendor: 'BLACK FOREST LABS', tag: '开源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文编辑指令,擅长上下文一致性编辑(改字/换装/换景)', '用祈使句直接下指令:"Change ... while keeping ..."', '连续编辑时重申身份锁定(same person, same face)'] },
    },
  ],
  t2v: [
    {
      id: 'sora-2', name: 'Sora 2 文生视频', vendor: 'OPENAI', tag: '闭源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文电影化叙事段落:场景 → 主体动作 → 镜头语言 → 光线氛围 → 时长', '镜头语言用专业词:dolly in, orbit, handheld, rack focus', '注明时长(如 "10-second shot")与画幅'] },
    },
    {
      id: 'kling-2', name: '可灵 Kling 2', vendor: 'KUAISHOU', tag: '闭源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文分层描述:主体动作 / 镜头运动 / 环境氛围 三层分开写', '运镜用可灵支持的词:推近/拉远/环绕/跟随/固定', '注明时长(5s/10s)与负面词(变形/跳帧/多余肢体)'] },
    },
    {
      id: 'veo-3', name: 'Veo 3', vendor: 'GOOGLE', tag: '闭源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文叙事段落,可含对白与音效描述(Veo 3 支持原生音频)', '音效用 [SFX: ...] 标注,对白用引号', '镜头与时长明确到秒'] },
    },
    {
      id: 'runway-gen3', name: 'Runway Gen-3 Alpha', vendor: 'RUNWAY', tag: '闭源·商用',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文 Prompt:[镜头类型]: [场景描述]. [主体动作]. [风格词]', '风格词放句末:cinematic, 35mm film, shallow depth of field', '避免多主体复杂交互,单主体单动作最稳'] },
    },
    {
      id: 'pika-3', name: 'Pika 3 文生视频', vendor: 'PIKA LABS', tag: '闭源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文短段落 + 参数建议(-motion 数值控制运动幅度)', '特效类需求用 Pika 效果词:explode, melt, inflate', '注明画幅与时长'] },
    },
    {
      id: 'wan-2.7', name: '万相 2.7 文生视频', vendor: 'ALIBABA', tag: '开源·旗舰',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文分层描述:画面主体 / 动作过程 / 运镜 / 光影氛围', '开源部署可附推理参数建议(帧数/分辨率/guidance)', '负面词单独一行:模糊、抖动、肢体畸变'] },
    },
    {
      id: 'happyhorse', name: '快乐马 HappyHorse', vendor: 'ALIBABA', tag: '低价',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文简洁描述(≤80 字),低价模型对复杂指令响应有限', '一个镜头一个动作,不写多镜头脚本', '注明「画质优先/速度优先」档位建议'] },
    },
    {
      id: 'seedance-2', name: 'Seedance 2', vendor: 'BYTEDANCE', tag: '闭源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文描述,含首帧画面 → 动作展开 → 尾帧收束的时间结构', '舞蹈/人物动作题材强,动作描述要具体到节拍', '注明镜头(固定/跟拍)与时长'] },
    },
  ],
  i2v: [
    {
      id: 'kling-2-i2v', name: '可灵 Kling 2 图生视频', vendor: 'KUAISHOU', tag: '闭源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出基于首帧图的动作描述:图中主体做什么 + 镜头怎么动', '强调稳定性约束:五官不变形、服装不变、无多余肢体', '动作幅度与运镜二选一做主角,另一个收着'] },
    },
    {
      id: 'seedance-2-i2v', name: 'Seedance 2 图生视频', vendor: 'BYTEDANCE', tag: '闭源·中文',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文动作指令,首帧即用户上传图', '人物舞蹈/表演类动作描述到具体动作名', '注明保持项:脸部、服装、背景一致'] },
    },
    {
      id: 'wan-2.7-i2v', name: '万相 2.7 图生视频', vendor: 'ALIBABA', tag: '开源·旗舰',
      schema: { lang: 'zh', style: 'natural',
        rules: ['输出中文分层:主体动作 / 环境动态(风/光/雾) / 镜头运动', '开源部署可附 motion score 建议', '负面词:变形、闪烁、突变'] },
    },
    {
      id: 'runway-gen3-i2v', name: 'Runway Gen-3 图生视频', vendor: 'RUNWAY', tag: '闭源·商用',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文动作+镜头描述,首帧为上传图', '用 "the subject in the image ..." 指代图中主体', '风格词与原图气质保持一致'] },
    },
    {
      id: 'veo-3-i2v', name: 'Veo 3 图生视频', vendor: 'GOOGLE', tag: '闭源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文描述,可含环境音效 [SFX] 标注', '动作自然延展原图场景,不引入原图没有的新主体', '注明时长与镜头'] },
    },
    {
      id: 'pika-3-i2v', name: 'Pika 3 图生视频', vendor: 'PIKA LABS', tag: '闭源',
      schema: { lang: 'en', style: 'natural',
        rules: ['输出英文短描述 + motion 参数建议', '特效变换类(融化/爆裂)是强项,可大胆用效果词', '写明哪些区域保持静止'] },
    },
  ],
}

/** 任务 id → 中文名 */
export const TASK_LABEL = Object.fromEntries(DOWNSTREAM_TASKS.map((t) => [t.id, t.label]))
