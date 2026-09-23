// Built-in default prompt templates (seeded on first run / restored via 恢复默认模板)

export const CATEGORIES = [
  { id: 'Image Editing', zh: '图片编辑', color: '#00e5ff' },
  { id: 'Product Ads', zh: '产品广告', color: '#ff2ec4' },
  { id: 'TikTok Covers', zh: 'TikTok 封面', color: '#a78bfa' },
  { id: 'K-pop Broadcast', zh: 'K-pop 打歌舞台', color: '#f472b6' },
  { id: 'Character Design', zh: '角色设计', color: '#34d399' },
  { id: 'UE5 Game Dev', zh: 'UE5 游戏开发', color: '#60a5fa' },
  { id: 'JSON Reverse Engineering', zh: 'JSON 图像反推', color: '#facc15' },
  { id: 'Video Prompt', zh: '视频提示词', color: '#fb923c' },
  { id: 'Workplace Feedback', zh: '工作反馈', color: '#94a3b8' },
  { id: 'System Prompt', zh: '系统提示词', color: '#e879f9' },
]

export const PLATFORMS = [
  '通用',
  'Nano Banana / Gemini',
  'Midjourney',
  'Stable Diffusion / ComfyUI',
  'Fotor',
  '即梦 / Seedream',
  'Kling / Runway',
  'ChatGPT / Claude / Fable',
  'UE5',
]

// staggered timestamps so default sorting looks natural
const ts = (i) => new Date(Date.UTC(2026, 5, 1, 8, 0, 0) + i * 3600 * 1000).toISOString()

export const DEFAULT_PROMPTS = [
  /* ============ Image Editing ============ */
  {
    id: 'default-001',
    title: '去除 Logo / Loading 图标（暗度锁定）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['去水印', 'logo', '暗度锁定', '修图'],
    description: '移除画面中的 logo、loading 图标或界面元素，同时锁死原图曝光，防止 AI 顺手把暗调画面提亮。',
    chinesePrompt:
      '去除图片中的 logo 和 loading 图标，被遮挡的区域按周围像素自然补全。严格保持原图的曝光、黑位和暗调氛围——禁止提亮画面任何部分。其余内容逐像素保持不变。',
    englishPrompt:
      'Remove the logo and loading icon from this image, reconstructing the covered area to match the surrounding pixels seamlessly. Strictly preserve the original exposure, black levels and dark moody atmosphere — do NOT brighten any part of the image. Everything else must remain pixel-identical.',
    shortPrompt: 'Remove logo/loading icon, keep original darkness and exposure unchanged.',
    strongPrompt:
      'TASK: remove logo + loading icon only.\nRULES:\n1. Inpaint removed areas to match surrounding texture, noise and gradient exactly.\n2. Exposure, black levels and shadows MUST stay identical — brightening = failure.\n3. Zero changes outside the removed elements.\n4. No added text, no added glow, no sharpening.',
    negativePrompt: 'brightened image, lifted shadows, glow, extra text, visible patch edges, blur, color shift',
    variables: [],
    usageNotes: '适合夜景/暗调截图去 UI。若模型仍提亮，把"禁止提亮"放到提示词第一句并重复一次。',
    isFavorite: true,
    createdAt: ts(0),
    updatedAt: ts(0),
    lastUsedAt: null,
  },
  {
    id: 'default-002',
    title: '去水印（红色涂抹区域保护）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['去水印', '蒙版保护', '修图'],
    description: '去除水印，但用户手动用红色涂抹标记的区域视为保护蒙版，一个像素都不能动。',
    chinesePrompt:
      '去除图片中的水印，修复区域与周围纹理无缝衔接。注意：图中红色涂抹标记的区域（{target_area}）是保护区，必须完全保持原样，不做任何修改、重绘或颜色调整。',
    englishPrompt:
      'Remove the watermark from this image with seamless inpainting. IMPORTANT: the area marked with red paint ({target_area}) is a protected mask — it must remain completely untouched, with no repainting, no color adjustment, no modification of any kind.',
    shortPrompt: 'Remove watermark; red-marked area is protected and must stay untouched.',
    strongPrompt:
      'TASK: watermark removal.\nPROTECTED MASK: everything under the red paint marks ({target_area}) — treat as read-only pixels.\nRULES:\n1. Remove watermark, inpaint seamlessly.\n2. Red-marked region: zero changes allowed.\n3. No global adjustments (brightness/contrast/saturation).\n4. Output same resolution as input.',
    negativePrompt: 'altered red-marked area, global color shift, blur, smudge, leftover watermark traces',
    variables: ['target_area'],
    usageNotes: '先在原图上用红色画笔涂住要保护的部分再上传。{target_area} 填保护对象，如"人物面部"。',
    isFavorite: false,
    createdAt: ts(1),
    updatedAt: ts(1),
    lastUsedAt: null,
  },
  {
    id: 'default-003',
    title: '替换手机屏幕内容',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['屏幕替换', '合成', '产品图'],
    description: '把照片里手机屏幕显示的内容换成指定图片，保持透视、反光和亮度真实。',
    chinesePrompt:
      '把图中手机屏幕上显示的内容替换为 {reference_image}。新屏幕内容必须匹配原屏幕的透视角度、圆角裁切、亮度和玻璃反光，看起来像真实显示在这台设备上。手机本体、手指位置和背景完全不变。',
    englishPrompt:
      'Replace the content displayed on the phone screen with {reference_image}. The new screen content must match the original screen\'s perspective, corner radius, brightness and glass reflections so it looks genuinely displayed on the device. The phone body, finger positions and background must remain unchanged.',
    shortPrompt: 'Replace phone screen content with {reference_image}, keep perspective and reflections realistic.',
    strongPrompt:
      'TASK: swap phone screen content only.\nNEW CONTENT: {reference_image}\nRULES:\n1. Warp new content to the exact screen perspective and corner radius.\n2. Preserve original screen brightness, glare and reflection layer on top.\n3. Phone body, hands, background: pixel-identical.\n4. No floating/misaligned edges.',
    negativePrompt: 'misaligned screen edges, missing reflections, changed phone body, changed hands, flat pasted look',
    variables: ['reference_image'],
    usageNotes: '{reference_image} 描述要放上去的画面，或直接附参考图。适合做 App 宣传图和带货图。',
    isFavorite: false,
    createdAt: ts(2),
    updatedAt: ts(2),
    lastUsedAt: null,
  },
  {
    id: 'default-004',
    title: '换装（脸和背景锁定）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['换装', '人像', '身份一致'],
    description: '只换衣服：脸、发型、姿势、背景、光照全部锁定不变。',
    chinesePrompt:
      '把 {subject} 的服装换成：{style}。新服装要自然贴合当前姿势，布料褶皱真实，并匹配场景光照。面部、发型、姿势、背景和光照必须与原图完全一致——一眼看上去是同一个人在同一个地方。',
    englishPrompt:
      'Change the outfit of {subject} to: {style}. The new clothing must fit the current pose naturally with realistic fabric folds and match the scene lighting. Face, hairstyle, pose, background and lighting must remain exactly identical to the original — clearly the same person in the same place.',
    shortPrompt: 'Change outfit to {style}; face, pose, background and lighting locked.',
    strongPrompt:
      'TASK: outfit swap only.\nNEW OUTFIT: {style}\nLOCKED (zero change): face, expression, skin, hairstyle, pose, hands, background, lighting, color grade.\nRULES:\n1. Clothing follows body pose with physically correct folds and shadows.\n2. Fabric texture must be photorealistic.\n3. Any change outside clothing = failure.',
    negativePrompt: 'changed face, changed hairstyle, changed pose, changed background, plastic fabric, floating clothes',
    variables: ['subject', 'style'],
    usageNotes: '{style} 写得越具体越稳：材质+颜色+版型，例如"黑色皮质机车夹克配白色内搭"。',
    isFavorite: true,
    createdAt: ts(3),
    updatedAt: ts(3),
    lastUsedAt: null,
  },
  {
    id: 'default-005',
    title: '换动作（角色一致性锁定)',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['换姿势', '角色一致', '人像'],
    description: '改变人物动作/姿势，但脸、发型、服装、体型必须保持是同一个人。',
    chinesePrompt:
      '把 {subject} 的动作改为：{object}。必须保持是同一个人：脸、发型、服装、体型、配饰完全一致。新姿势的人体结构要正确，手指自然。背景和光照保持原样。',
    englishPrompt:
      'Change the pose of {subject} to: {object}. It must remain the same person: identical face, hairstyle, outfit, body type and accessories. The new pose must be anatomically correct with natural hands. Keep the background and lighting unchanged.',
    shortPrompt: 'Change pose to {object}; same person, same outfit, same background.',
    strongPrompt:
      'TASK: pose change only.\nNEW POSE: {object}\nIDENTITY LOCK: face, hairstyle, outfit, body proportions, accessories — must be recognizably the same person.\nRULES:\n1. Anatomically correct body, 5 fingers per hand.\n2. Clothing re-drapes correctly for the new pose.\n3. Background and lighting unchanged.',
    negativePrompt: 'different person, changed outfit, extra fingers, broken anatomy, changed background',
    variables: ['subject', 'object'],
    usageNotes: '{object} 填目标动作，如"双手抱胸侧身回头"。动作幅度越大越容易崩脸，必要时分两步改。',
    isFavorite: false,
    createdAt: ts(4),
    updatedAt: ts(4),
    lastUsedAt: null,
  },
  {
    id: 'default-006',
    title: '替换背景（主体保留）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['换背景', '抠图', '合成'],
    description: '干净抠出主体换到新背景，发丝级边缘，主体轻度重打光融入新环境。',
    chinesePrompt:
      '把背景替换为：{background}。主体 {subject} 要完整保留并干净抠出，包括发丝和半透明边缘。根据新背景的光源方向对主体做轻微重新打光，并统一色温，使合成结果自然可信。',
    englishPrompt:
      'Replace the background with: {background}. Keep the subject {subject} fully intact with a clean cutout including hair strands and semi-transparent edges. Subtly relight the subject to match the new background\'s light direction and unify the color temperature so the composite looks believable.',
    shortPrompt: 'Replace background with {background}, keep subject, hair-level edges, relight to match.',
    strongPrompt:
      'TASK: background replacement.\nNEW BACKGROUND: {background}\nRULES:\n1. Subject cutout must preserve individual hair strands and soft edges.\n2. Relight subject to match new light direction and color temperature.\n3. Add contact shadow where subject meets ground.\n4. Subject\'s face, outfit and pose stay identical.',
    negativePrompt: 'hard cutout edges, halo around subject, mismatched lighting, floating subject without shadow',
    variables: ['subject', 'background'],
    usageNotes: '新背景描述里带上光线信息（如"黄昏逆光的海边"）能让融合效果好一个档次。',
    isFavorite: false,
    createdAt: ts(5),
    updatedAt: ts(5),
    lastUsedAt: null,
  },
  {
    id: 'default-007',
    title: '人物融入环境（合成统一）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['合成', '融合', '调色'],
    description: '修复"贴上去"的合成感：统一色温、阴影、颗粒，让主体像原生拍摄的一部分。',
    chinesePrompt:
      '让 {subject} 无缝融入当前环境。统一主体与背景的色温、对比度和饱和度；根据环境光源补正确方向的阴影和接触阴影；给主体加上与背景一致的颗粒/噪点。结果要像一次实拍完成的照片，而不是合成图。',
    englishPrompt:
      'Make {subject} blend seamlessly into the environment. Unify color temperature, contrast and saturation between subject and background; add correctly-directed cast and contact shadows based on the scene\'s light source; match the film grain/noise of the background on the subject. The result must look like a single photograph, not a composite.',
    shortPrompt: 'Blend {subject} into the scene: unify color, shadows and grain.',
    strongPrompt:
      'TASK: composite integration.\nRULES:\n1. Color temperature/contrast/saturation of subject = background.\n2. Cast shadow + contact shadow follow the scene light direction.\n3. Ambient color spill from environment onto subject edges.\n4. Grain and sharpness level matched.\n5. Subject identity and pose unchanged.',
    negativePrompt: 'pasted-on look, wrong shadow direction, mismatched color temperature, clean subject on grainy background',
    variables: ['subject'],
    usageNotes: '常用于把抠好的人物贴进新场景后的最后一步"融合修复"。',
    isFavorite: false,
    createdAt: ts(6),
    updatedAt: ts(6),
    lastUsedAt: null,
  },
  {
    id: 'default-008',
    title: '超分辨率修复（拒绝塑料感）',
    category: 'Image Editing',
    platform: '通用',
    tags: ['高清修复', '超分', '细节增强'],
    description: '低清图放大修复，强调真实皮肤纹理和发丝，禁止 AI 磨皮。',
    chinesePrompt:
      '把这张图片修复并放大到高分辨率。恢复真实的皮肤纹理（毛孔、细纹）、独立发丝和布料编织纹理。构图、色彩、光照和人物身份保持完全一致。要自然的清晰，不要 AI 磨皮的塑料感。',
    englishPrompt:
      'Restore and upscale this image to high resolution. Recover realistic skin texture (pores, fine lines), individual hair strands and fabric weave. Keep composition, colors, lighting and identity exactly the same. The sharpness must look natural — no AI-smoothed plastic skin.',
    shortPrompt: 'Upscale with realistic skin/hair/fabric texture, no plastic AI smoothing.',
    strongPrompt:
      'TASK: super-resolution restoration.\nRULES:\n1. Recover pores, fine lines, individual hair strands, fabric weave.\n2. Identity, composition, colors, lighting: unchanged.\n3. FORBIDDEN: skin smoothing, beauty filter look, waxy texture, oversharpening halos.\n4. Output: 4K equivalent detail level.',
    negativePrompt: 'plastic skin, beauty filter, waxy texture, oversharpening halo, changed face, color shift',
    variables: [],
    usageNotes: '老照片、截图、低清素材救星。Fotor 的 AI 放大也可以配合这个思路先修复再放大。',
    isFavorite: false,
    createdAt: ts(7),
    updatedAt: ts(7),
    lastUsedAt: null,
  },
  {
    id: 'default-009',
    title: '移除路人 / 杂物（干净填充）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['移除物体', '路人', '修图'],
    description: '移除画面中的路人或杂物，背景按透视自然延伸补全。',
    chinesePrompt:
      '把图中的 {object} 完全移除。移除后的区域用背景的合理延伸补全：纹理、透视线、光照和颗粒都要与周围一致，不能留下模糊块或重复贴图痕迹。其余画面保持不变。',
    englishPrompt:
      'Completely remove {object} from this image. Fill the removed area with a plausible continuation of the background — texture, perspective lines, lighting and grain must match the surroundings, with no blur patches or repeated-texture artifacts. Everything else stays unchanged.',
    shortPrompt: 'Remove {object}, fill background naturally, no artifacts.',
    strongPrompt:
      'TASK: object removal.\nTARGET: {object}\nRULES:\n1. Continue background structures (lines, edges, patterns) through the removed area with correct perspective.\n2. Match grain and lighting.\n3. FORBIDDEN: blur patches, cloned/repeated textures, ghost outlines.\n4. Rest of image: pixel-identical.',
    negativePrompt: 'ghost outline, blur patch, repeated texture, warped background lines, leftover fragments',
    variables: ['object'],
    usageNotes: '{object} 描述位置更稳，如"画面右侧穿蓝色衣服的路人"。',
    isFavorite: false,
    createdAt: ts(8),
    updatedAt: ts(8),
    lastUsedAt: null,
  },
  {
    id: 'default-010',
    title: '电影感重新打光（Relight）',
    category: 'Image Editing',
    platform: 'Nano Banana / Gemini',
    tags: ['打光', '调色', '氛围'],
    description: '保持人物和构图不变，重打一套电影感灯光。',
    chinesePrompt:
      '为这张照片重新打光：{style} 风格的电影感灯光。改变光线方向、色温和明暗对比来塑造氛围，但人物身份、姿势、服装和构图必须完全不变。光要"打在"人身上，有真实的高光、阴影过渡和眼神光。',
    englishPrompt:
      'Relight this photo with cinematic {style} lighting. Change light direction, color temperature and contrast to build mood, but identity, pose, outfit and composition must remain exactly unchanged. The light must physically wrap the subject with believable highlights, shadow falloff and catchlights in the eyes.',
    shortPrompt: 'Cinematic relight in {style} style, subject and composition locked.',
    strongPrompt:
      'TASK: relighting only.\nLIGHTING STYLE: {style}\nRULES:\n1. New light must produce physically-correct highlights, core shadows and catchlights.\n2. Identity, pose, outfit, composition: locked.\n3. Skin tone stays natural under new color temperature.\n4. No background replacement — only its lighting may change consistently.',
    negativePrompt: 'flat fake light, changed face, changed pose, blown highlights, unnatural skin color',
    variables: ['style'],
    usageNotes: '{style} 示例："青橙色调夜景霓虹"、"伦勃朗式单侧窗光"、"日落金色逆光"。',
    isFavorite: false,
    createdAt: ts(9),
    updatedAt: ts(9),
    lastUsedAt: null,
  },

  /* ============ Product Ads ============ */
  {
    id: 'default-011',
    title: '产品 Hero Shot（广告主视觉）',
    category: 'Product Ads',
    platform: 'Midjourney',
    tags: ['产品图', 'hero shot', '广告'],
    description: '影棚级产品主视觉：主光+彩色轮廓光+倒影，预留文案位。',
    chinesePrompt:
      '为 {object} 制作高端广告主视觉。影棚布光：强主光塑形，{style} 色的轮廓光勾边；背景为 {background}；产品下方有微妙倒影；浅景深，广告级构图，画面上方预留标题文案区域。商业摄影质感，8K 细节。',
    englishPrompt:
      'Create a premium advertising hero shot of {object}. Studio lighting: strong key light for shape, {style} colored rim light on edges; background: {background}; subtle reflection under the product; shallow depth of field, advertising-grade composition with headline space reserved at the top. Commercial photography quality, 8K detail.',
    shortPrompt: 'Premium hero shot of {object}, studio lighting, rim light, reflection, ad composition.',
    strongPrompt:
      'TASK: product hero shot.\nPRODUCT: {object} — label/logo must stay accurate and undistorted.\nSETUP:\n1. Key light + {style} rim light + soft fill.\n2. Background: {background}.\n3. Reflection below, shallow DOF.\n4. Top 25% reserved as clean copy space.\n5. Photorealistic commercial quality, no illustration look.',
    negativePrompt: 'distorted product, wrong logo text, cluttered background, flat lighting, cartoon style',
    variables: ['object', 'style', 'background'],
    usageNotes: '产品名和瓶身文字容易被 AI 改写，生成后记得用局部重绘或 PS 修正标签。',
    isFavorite: false,
    createdAt: ts(10),
    updatedAt: ts(10),
    lastUsedAt: null,
  },
  {
    id: 'default-012',
    title: '护肤品高端广告（水感质感）',
    category: 'Product Ads',
    platform: 'Midjourney',
    tags: ['护肤品', '广告', '水花', '高端'],
    description: '护肤品广告标准范式：水花/水面+玻璃质感+柔光，奢侈品调性。',
    chinesePrompt:
      '高端护肤品广告：{object} 立于平静水面上，周围有冻结的水花溅起，水珠挂在瓶身。柔和的顶部环形光，背景是 {background} 的渐变。玻璃与液体质感通透，色调干净高级，类似雅诗兰黛/兰蔻广告调性。竖版 3:4。',
    englishPrompt:
      'Luxury skincare advertisement: {object} standing on a calm water surface with frozen splash around it, water droplets on the bottle. Soft top ring light, {background} gradient backdrop. Crystal-clear glass and liquid textures, clean premium color grading in the style of Estée Lauder / Lancôme campaigns. Vertical 3:4.',
    shortPrompt: 'Luxury skincare ad: {object} on water with frozen splash, soft light, premium grading, 3:4.',
    strongPrompt:
      'TASK: luxury skincare ad shot.\nPRODUCT: {object} — keep bottle shape and label legible.\nSCENE: calm water surface, frozen splash arcs, droplets on glass.\nLIGHT: soft ring light top, gentle gradient background ({background}).\nGRADE: clean, airy, high-key luxury. NO oversaturation.\nFORMAT: 3:4 vertical, product centered, copy space top.',
    negativePrompt: 'messy splash covering product, unreadable label, oversaturated colors, cheap plastic look, busy background',
    variables: ['object', 'background'],
    usageNotes: '水花参数很吃随机数，建议一次生成 4 张挑最干净的一张再放大。',
    isFavorite: false,
    createdAt: ts(11),
    updatedAt: ts(11),
    lastUsedAt: null,
  },
  {
    id: 'default-013',
    title: '食品广告（食欲感放大）',
    category: 'Product Ads',
    platform: 'Midjourney',
    tags: ['食品', '广告', '食欲感'],
    description: '食品广告：微距+热气+酱汁流动+高光，把食欲感拉满。',
    chinesePrompt:
      '为 {object} 拍一张食欲感拉满的广告图：微距视角，表面有诱人的油光和酱汁流动感，刚出锅的热气缭绕，暖色调侧逆光突出质感，背景 {background} 虚化。色彩饱满但真实，像高端餐饮菜单摄影。',
    englishPrompt:
      'Shoot a mouth-watering advertisement of {object}: macro perspective, glistening surface with flowing sauce, fresh steam rising, warm side-backlight emphasizing texture, blurred {background} behind. Rich but realistic colors, like premium restaurant menu photography.',
    shortPrompt: 'Mouth-watering food ad of {object}: macro, steam, glistening sauce, warm backlight.',
    strongPrompt:
      'TASK: appetite-maximizing food ad.\nSUBJECT: {object}.\nMANDATORY ELEMENTS:\n1. Macro detail: texture, glisten, sauce flow.\n2. Visible steam (fresh & hot).\n3. Warm side-backlight rim.\n4. Blurred background: {background}.\nGRADE: saturated but believable — no radioactive colors, food must look edible and real.',
    negativePrompt: 'plastic-looking food, radioactive saturation, cold blue tone, messy plate, artificial gloss',
    variables: ['object', 'background'],
    usageNotes: '热气和酱汁是食欲感两大杀器，但容易过量——加"真实可信"约束防止变成假图。',
    isFavorite: false,
    createdAt: ts(12),
    updatedAt: ts(12),
    lastUsedAt: null,
  },
  {
    id: 'default-014',
    title: '电商白底产品图（平台合规）',
    category: 'Product Ads',
    platform: 'Fotor',
    tags: ['白底图', '电商', '抠图'],
    description: '标准电商白底图：纯白背景+软阴影+产品无变形，可直接上架。',
    chinesePrompt:
      '把 {object} 处理成标准电商白底图：纯白色背景（#FFFFFF），产品居中占画面 80%，底部有柔和的自然投影，边缘干净无毛边。产品本体的颜色、形状、标签文字完全保持原样，不做任何美化变形。1:1 方图。',
    englishPrompt:
      'Convert {object} into a standard e-commerce white-background image: pure white (#FFFFFF) backdrop, product centered at 80% of frame, soft natural drop shadow below, clean edges with no fringing. The product\'s colors, shape and label text must stay exactly as the original with zero beautification or distortion. 1:1 square.',
    shortPrompt: 'E-commerce white background cutout of {object}, soft shadow, 1:1, product unchanged.',
    strongPrompt:
      'TASK: marketplace-compliant product cutout.\nRULES:\n1. Background: pure #FFFFFF, nothing else.\n2. Product centered, ~80% of frame, 1:1.\n3. Soft contact shadow only — no reflections, no props.\n4. Product color/shape/label: locked, zero edits.\n5. Edges: clean, no halo, hair-level precision if fabric/fur.',
    negativePrompt: 'gray background, colored cast on white, halo edges, altered product color, props, reflections',
    variables: ['object'],
    usageNotes: '主流电商平台主图要求基本都是纯白底+主体占比 70-85%，这个模板直接对齐规则。',
    isFavorite: false,
    createdAt: ts(13),
    updatedAt: ts(13),
    lastUsedAt: null,
  },

  /* ============ TikTok Covers ============ */
  {
    id: 'default-015',
    title: 'TikTok 高冲突感封面',
    category: 'TikTok Covers',
    platform: '即梦 / Seedream',
    tags: ['封面', 'TikTok', '高点击', '9:16'],
    description: '制造强烈视觉冲突的竖版封面：夸张表情/对比场景+标题留白，专为停住滑动设计。',
    chinesePrompt:
      '制作一张高冲突感的 TikTok 竖版封面（9:16）：{subject} 处于画面中心偏下，表情或动作定格在最有戏剧张力的瞬间；背景与主体形成强烈的颜色或情景对比（{background}）；顶部 1/4 留出干净区域放大号标题文字；整体高饱和、高对比，缩略图状态下也一眼看清主体。',
    englishPrompt:
      'Create a high-conflict TikTok vertical cover (9:16): {subject} positioned center-low, expression or action frozen at the most dramatic moment; strong color or situational contrast between subject and background ({background}); top quarter kept clean for large title text; high saturation and contrast overall, subject instantly readable even at thumbnail size.',
    shortPrompt: 'High-conflict 9:16 TikTok cover of {subject}, dramatic moment, title space on top.',
    strongPrompt:
      'TASK: scroll-stopping TikTok cover.\nFORMAT: 9:16 vertical.\nCOMPOSITION RULES:\n1. {subject} at lower-center, occupying 50-65% of frame.\n2. Peak-drama expression/action — mid-motion freeze.\n3. Background {background} must contrast hard with subject (color or context).\n4. Top 25%: clean title zone, no clutter.\n5. Readable at 150px thumbnail. High contrast, no muddy midtones.',
    negativePrompt: 'flat emotion, cluttered top area, low contrast, muddy colors, subject too small, watermark',
    variables: ['subject', 'background'],
    usageNotes: '"冲突"可以是表情 vs 场景、大小对比、颜色对撞。标题文字建议后期用剪映/PS 加，不要让 AI 生成文字。',
    isFavorite: true,
    createdAt: ts(14),
    updatedAt: ts(14),
    lastUsedAt: null,
  },
  {
    id: 'default-016',
    title: 'Fotor Magic Edit 功能展示封面',
    category: 'TikTok Covers',
    platform: 'Fotor',
    tags: ['封面', 'Fotor', '前后对比', '教程'],
    description: '编辑前/后对比式封面，展示 Magic Edit 修图效果，适合工具教程类视频。',
    chinesePrompt:
      '制作一张 Fotor Magic Edit 功能展示封面（9:16）：画面左右或对角分割为"编辑前 vs 编辑后"对比——左侧是原图（{target_area} 有明显瑕疵/水印/杂物），右侧是修复后的干净版本；中间用一道发光的分割线或魔法笔刷划过的轨迹分隔；右上角预留"Magic Edit"标题位；整体科技感配色，青紫色霓虹点缀。',
    englishPrompt:
      'Create a Fotor Magic Edit showcase cover (9:16): split-screen or diagonal "before vs after" comparison — left side shows the original with visible flaws/watermark/clutter in {target_area}, right side shows the cleanly repaired version; separated by a glowing divider or a magic brush stroke trail; title space reserved top-right for "Magic Edit"; tech-styled color scheme with cyan-purple neon accents.',
    shortPrompt: 'Before/after split cover for Fotor Magic Edit, glowing divider, 9:16.',
    strongPrompt:
      'TASK: tool-demo cover, before/after format.\nLAYOUT:\n1. 9:16, split-screen (vertical or diagonal).\n2. LEFT: original image, flaw visible in {target_area}.\n3. RIGHT: repaired result, dramatically cleaner.\n4. Divider: glowing magic-brush stroke, cyan-purple neon.\n5. Top-right: clean title zone.\nRULE: the before/after difference must be obvious at thumbnail size.',
    negativePrompt: 'identical before/after, unclear split, cluttered layout, dull colors, tiny difference',
    variables: ['target_area'],
    usageNotes: '配合 rosiecut 工作流用：前后对比帧直接从录屏里截，AI 只负责美化排版底图。',
    isFavorite: false,
    createdAt: ts(15),
    updatedAt: ts(15),
    lastUsedAt: null,
  },
  {
    id: 'default-017',
    title: '三连封面（系列统一模板）',
    category: 'TikTok Covers',
    platform: '即梦 / Seedream',
    tags: ['封面', '系列', '模板统一'],
    description: '同一账号的系列视频封面：固定构图和配色，只换主体和标题，保持主页视觉统一。',
    chinesePrompt:
      '为系列视频设计统一封面模板（9:16）：固定要素——{style} 的配色方案、主体居中占 60%、底部固定色块放集数标签、顶部固定标题区。本期主体为 {subject}。构图、色调、装饰元素与系列其他封面严格一致，只有主体和文字内容不同，保证账号主页三连排列时视觉整齐。',
    englishPrompt:
      'Design a unified series cover template (9:16): fixed elements — {style} color scheme, subject centered at 60% of frame, fixed color block at bottom for episode label, fixed title zone on top. This episode\'s subject: {subject}. Composition, grading and decorative elements must stay strictly consistent with other covers in the series; only subject and text change, so the profile grid looks perfectly aligned.',
    shortPrompt: 'Series-consistent 9:16 cover template, {style} scheme, subject swap only.',
    strongPrompt:
      'TASK: series cover, template-locked.\nLOCKED TEMPLATE: {style} palette, center composition (subject 60%), bottom episode-label band, top title zone.\nVARIABLE: subject = {subject}.\nRULES:\n1. Grading identical across series.\n2. Decorative elements: same position every episode.\n3. Only subject + text differ.\n4. Grid-view consistency is the success metric.',
    negativePrompt: 'inconsistent palette, shifted layout, different decorative style, random composition',
    variables: ['subject', 'style'],
    usageNotes: '先用这个模板生成 3 张不同主体的封面测试统一度，满意后把 {style} 的描述固化下来复用。',
    isFavorite: false,
    createdAt: ts(16),
    updatedAt: ts(16),
    lastUsedAt: null,
  },

  /* ============ K-pop Broadcast ============ */
  {
    id: 'default-018',
    title: 'K-pop 音乐节目直播截图',
    category: 'K-pop Broadcast',
    platform: 'Nano Banana / Gemini',
    tags: ['K-pop', '打歌舞台', '直播感', '截图风'],
    description: '还原 M Countdown / Music Bank 风格的打歌节目直播截图：舞台灯光+播出字幕条+广播质感。',
    chinesePrompt:
      '生成一张 K-pop 音乐打歌节目的直播截图：{subject} 在舞台上表演，动感舞台灯光（激光、染色光束、LED 大屏背景），画面带有电视播出的轻微动态模糊和广播级色彩；左上角有节目 LOGO 水印位，底部有歌名字幕条造型（不写真实文字）；整体像从 M Countdown / Music Bank 直播流里截出来的一帧。16:9 横版。',
    englishPrompt:
      'Generate a live broadcast screenshot from a K-pop music show: {subject} performing on stage with dynamic stage lighting (lasers, colored beams, LED wall background), slight motion blur and broadcast-grade color typical of TV footage; program logo watermark position top-left, song-title caption bar shape at the bottom (no real text); the whole frame should look like a still captured from an M Countdown / Music Bank live stream. 16:9 landscape.',
    shortPrompt: 'K-pop music show live broadcast frame of {subject}, stage lights, caption bar, 16:9.',
    strongPrompt:
      'TASK: K-pop broadcast still.\nSUBJECT: {subject} mid-performance.\nMANDATORY BROADCAST MARKERS:\n1. Stage: lasers + colored beams + LED wall.\n2. Slight motion blur, broadcast color grade (slightly lifted blacks).\n3. Top-left: logo watermark placeholder.\n4. Bottom: caption bar shape, NO readable text.\n5. 16:9, shot from broadcast camera distance (not phone fancam).\nIdentity of subject must stay consistent.',
    negativePrompt: 'readable fake text, photoshoot look, clean studio portrait, phone fancam angle, no stage lights',
    variables: ['subject'],
    usageNotes: '要"像直播截图"而不是"像写真"，关键在轻微动态模糊+字幕条造型+广播色。文字后期自己加避免乱码。',
    isFavorite: false,
    createdAt: ts(17),
    updatedAt: ts(17),
    lastUsedAt: null,
  },
  {
    id: 'default-019',
    title: 'K-pop 直拍帧（Fancam 竖版）',
    category: 'K-pop Broadcast',
    platform: 'Nano Banana / Gemini',
    tags: ['K-pop', '直拍', 'fancam', '9:16'],
    description: '打歌舞台直拍（fancam）风格的全身竖版帧：跟拍视角、舞台灯气氛、轻微噪点。',
    chinesePrompt:
      '生成一帧 K-pop 打歌舞台直拍（fancam）画面：{subject} 全身入镜，正在做舞蹈动作，镜头视角是观众席中部的跟拍机位（轻微仰角）；舞台染色灯从背后打出轮廓光，空气中有薄雾感；画面带直拍特有的轻微噪点和对焦呼吸感。9:16 竖版，人物占画面 70% 以上。',
    englishPrompt:
      'Generate one frame of a K-pop stage fancam: {subject} full-body in frame mid-dance-move, camera angle from a mid-audience tracking position (slight low angle); colored stage lights create rim light from behind, thin haze in the air; the frame carries fancam-typical light noise and focus-breathing feel. 9:16 vertical, subject filling 70%+ of the frame.',
    shortPrompt: 'K-pop fancam frame of {subject}, full body mid-dance, rim light, haze, 9:16.',
    strongPrompt:
      'TASK: fancam-style stage frame.\nSUBJECT: {subject}, full body, mid-choreography.\nCAMERA: mid-audience tracking cam, slight low angle, 9:16.\nATMOSPHERE:\n1. Colored rim light from stage rear.\n2. Thin haze, light lens noise.\n3. Subject 70%+ of frame height.\nFORBIDDEN: studio-photo cleanliness, broadcast caption bars, wide stage shot.',
    negativePrompt: 'studio portrait look, caption bars, wide shot with tiny subject, clean noiseless image',
    variables: ['subject'],
    usageNotes: '和"直播截图"模板配对使用：一个横版广播机位，一个竖版直拍机位，同一舞台两种素材。',
    isFavorite: false,
    createdAt: ts(18),
    updatedAt: ts(18),
    lastUsedAt: null,
  },

  /* ============ Character Design ============ */
  {
    id: 'default-020',
    title: '角色三视图设定表',
    category: 'Character Design',
    platform: 'Midjourney',
    tags: ['角色设计', '三视图', '设定表'],
    description: '标准角色设定表：正面/侧面/背面三视图+表情小图，白底设定集排版。',
    chinesePrompt:
      '为角色 {subject} 制作标准设定表（character sheet）：同一角色的正面、侧面、背面三视图并排站立，比例一致；下方一排 4 个表情特写（默认/微笑/愤怒/惊讶）；{style} 画风；浅灰白设定集底色，角色边缘干净利落，服装细节在三个视角保持完全一致。16:9 横版。',
    englishPrompt:
      'Create a standard character sheet for {subject}: front, side and back full-body views of the same character standing side by side with consistent proportions; a row of 4 expression close-ups below (neutral / smile / angry / surprised); {style} art style; light gray-white model-sheet background, clean character edges, outfit details perfectly consistent across all three views. 16:9 landscape.',
    shortPrompt: 'Character sheet of {subject}: front/side/back turnaround + 4 expressions, {style} style.',
    strongPrompt:
      'TASK: production character sheet.\nCHARACTER: {subject}.\nLAYOUT:\n1. Top row: front / side / back full-body, same height, same proportions.\n2. Bottom row: 4 expression heads (neutral, smile, angry, surprised).\n3. Style: {style}. Background: flat light gray.\nCONSISTENCY RULE: outfit, colors, accessories identical in all views — this sheet is for downstream AI/3D reference.',
    negativePrompt: 'inconsistent outfit between views, different proportions, dynamic poses, scene background',
    variables: ['subject', 'style'],
    usageNotes: '做角色一致性的地基素材：先出设定表，之后所有单图都引用它做参考图。',
    isFavorite: false,
    createdAt: ts(19),
    updatedAt: ts(19),
    lastUsedAt: null,
  },
  {
    id: 'default-021',
    title: '赛博朋克女主角概念设定',
    category: 'Character Design',
    platform: 'Midjourney',
    tags: ['赛博朋克', '角色设计', '概念图'],
    description: '赛博朋克风女主角概念图：义体细节+霓虹环境光+电影感构图。',
    chinesePrompt:
      '赛博朋克女主角概念设定图：{subject}，带有精细的义体改造细节（颈部接口、机械手臂纹路、皮下发光线路），穿 {style} 风格的战术服装；站在雨夜霓虹街头，青色和品红色的霓虹灯在湿滑地面上反射；3/4 身构图，电影感打光，概念艺术品质，细节丰富。',
    englishPrompt:
      'Cyberpunk female protagonist concept art: {subject}, with intricate cybernetic augmentation details (neck ports, mechanical arm etching, subdermal glowing circuits), wearing {style} tactical outfit; standing in a rainy neon street at night, cyan and magenta neon reflecting on wet pavement; 3/4 body composition, cinematic lighting, concept-art quality, richly detailed.',
    shortPrompt: 'Cyberpunk heroine concept: {subject}, cybernetic details, neon rain street, cinematic.',
    strongPrompt:
      'TASK: AAA-grade character concept art.\nCHARACTER: {subject}, female protagonist.\nMANDATORY DETAILS:\n1. Cybernetics: neck port, mech-arm etching, glowing subdermal circuits.\n2. Outfit: {style} tactical.\n3. Scene: rain-wet neon street, cyan/magenta reflections.\n4. 3/4 body, cinematic key light + neon rim.\nQUALITY BAR: portfolio-grade concept art, coherent anatomy, no plastic skin.',
    negativePrompt: 'generic anime face, plastic skin, broken anatomy, daylight scene, dull colors',
    variables: ['subject', 'style'],
    usageNotes: '可与 UE5 原型模板联动：先出概念图定风格，再喂给 UE5 场景提示词统一美术方向。',
    isFavorite: false,
    createdAt: ts(20),
    updatedAt: ts(20),
    lastUsedAt: null,
  },
  {
    id: 'default-022',
    title: '角色一致性多场景衍生',
    category: 'Character Design',
    platform: 'Nano Banana / Gemini',
    tags: ['角色一致', '多场景', 'IP'],
    description: '基于参考图把同一角色放进新场景/新动作，五官发型服装严格锁定。',
    chinesePrompt:
      '参考附图中的角色 {reference_image}，生成同一角色在新场景中的画面：场景为 {background}，动作为 {object}。角色的五官、发型、发色、服装配色和身材比例必须与参考图完全一致——观众要能立刻认出是同一个角色。画风与参考图保持统一。',
    englishPrompt:
      'Using the character in the attached reference {reference_image}, generate the same character in a new scene: environment {background}, action {object}. The character\'s facial features, hairstyle, hair color, outfit colors and body proportions must match the reference exactly — viewers must instantly recognize the same character. Keep the art style consistent with the reference.',
    shortPrompt: 'Same character from {reference_image} in new scene {background}, doing {object}.',
    strongPrompt:
      'TASK: character-consistent scene generation.\nREFERENCE: {reference_image} — the single source of truth.\nNEW SCENE: {background}. NEW ACTION: {object}.\nIDENTITY LOCK (zero drift): face geometry, eye shape/color, hairstyle+color, outfit design+palette, body proportions, art style.\nFAIL CONDITION: any viewer hesitation about whether it\'s the same character.',
    negativePrompt: 'face drift, changed hairstyle, outfit redesign, style shift, different proportions',
    variables: ['reference_image', 'background', 'object'],
    usageNotes: '做 IP 内容的核心模板。参考图选正面清晰全身图效果最稳。',
    isFavorite: false,
    createdAt: ts(21),
    updatedAt: ts(21),
    lastUsedAt: null,
  },

  /* ============ UE5 Game Dev ============ */
  {
    id: 'default-023',
    title: 'UE5 赛博朋克游戏原型（vibe coding）',
    category: 'UE5 Game Dev',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['UE5', '原型', '赛博朋克', 'vibe coding'],
    description: '让 AI 扮演 UE5 技术策划，输出可执行的赛博朋克游戏原型开发方案。',
    chinesePrompt:
      '你是一名资深 UE5 技术策划兼独立游戏开发者。帮我设计一个赛博朋克题材的游戏原型：{subject}。请输出：\n1. 核心玩法循环（30 秒内说清楚）；\n2. 需要用到的 UE5 系统（Blueprint / Niagara / Lumen / Nanite / MetaHuman，说明各自用在哪）；\n3. 最小可行资产清单（哪些用 Marketplace 免费资产，哪些自己做）；\n4. 单人开发者的四周实现路线图，按周拆分；\n5. 第一周要搭的三个 Blueprint，写到关键节点级别。\n所有建议以"能跑起来"为第一优先级，不追求完美。',
    englishPrompt:
      'You are a senior UE5 technical designer and solo indie developer. Design a cyberpunk game prototype for me: {subject}. Deliver:\n1. Core gameplay loop (explainable in 30 seconds);\n2. Required UE5 systems (Blueprint / Niagara / Lumen / Nanite / MetaHuman — state where each is used);\n3. Minimum viable asset list (which come free from Marketplace, which are custom);\n4. A 4-week solo-dev roadmap, split by week;\n5. The first three Blueprints to build in week 1, detailed to key-node level.\nAll advice prioritizes "runs today" over perfection.',
    shortPrompt: 'Act as UE5 tech designer: cyberpunk prototype plan for {subject}, gameplay loop + blueprints + 4-week roadmap.',
    strongPrompt:
      'ROLE: senior UE5 technical designer.\nGOAL: playable cyberpunk prototype — {subject}.\nOUTPUT FORMAT (mandatory sections):\n## 1. Core Loop (≤3 sentences)\n## 2. UE5 Systems Map (system → usage)\n## 3. MVP Asset List (source: marketplace/custom)\n## 4. Week-by-week Roadmap (4 weeks, solo dev)\n## 5. First 3 Blueprints (node-level detail)\nCONSTRAINTS: free/cheap assets first; no C++ unless unavoidable; every step must be verifiable in-editor same day.',
    negativePrompt: '',
    variables: ['subject'],
    usageNotes: '配合 Marathon 项目经验用：{subject} 描述越像电梯稿越好，例如"5v5 下包模式的霓虹街区 FPS"。',
    isFavorite: false,
    createdAt: ts(22),
    updatedAt: ts(22),
    lastUsedAt: null,
  },
  {
    id: 'default-024',
    title: 'UE5 Blueprint 节点级实现',
    category: 'UE5 Game Dev',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['UE5', 'Blueprint', '节点图', '实现'],
    description: '把一个具体游戏机制拆解成 Blueprint 节点级步骤，照着连线就能跑。',
    chinesePrompt:
      '你是 UE5 Blueprint 专家。我要实现这个机制：{subject}。请输出节点级实现步骤：\n1. 需要创建的 Blueprint 类（父类是什么）；\n2. 变量清单（名称 / 类型 / 默认值 / 是否 Instance Editable）；\n3. 事件图逐节点连线说明，格式为「节点A(参数) → 节点B(参数)」，包括执行引脚和数据引脚；\n4. 需要注意的常见坑（如 Cast 失败、网络复制、Tick 性能）；\n5. 如何在编辑器里 5 分钟内验证它能工作。\n假设我是会连节点但不懂 C++ 的独立开发者。',
    englishPrompt:
      'You are a UE5 Blueprint expert. I need to implement this mechanic: {subject}. Output node-level implementation steps:\n1. Blueprint classes to create (and their parent classes);\n2. Variable list (name / type / default / instance-editable?);\n3. Event graph wiring described node by node, in the format "NodeA(params) → NodeB(params)", covering both exec and data pins;\n4. Common pitfalls (failed casts, replication, Tick cost);\n5. How to verify it works in-editor within 5 minutes.\nAssume I can wire nodes but don\'t write C++.',
    shortPrompt: 'UE5 Blueprint node-level walkthrough for mechanic: {subject}.',
    strongPrompt:
      'ROLE: UE5 Blueprint expert. TARGET MECHANIC: {subject}.\nOUTPUT SECTIONS (mandatory):\n## Classes (name + parent)\n## Variables (table: name|type|default|editable)\n## Graph Wiring (numbered: NodeA(pin) → NodeB(pin), exec + data pins explicit)\n## Pitfalls (cast/replication/tick)\n## 5-min Verification Steps\nRULES: no C++; use engine-standard nodes only; every wiring step must be reproducible exactly as written.',
    negativePrompt: '',
    variables: ['subject'],
    usageNotes: '{subject} 要具体到机制级，例如"C4 下包与拆包交互，带进度条和音效"。',
    isFavorite: false,
    createdAt: ts(23),
    updatedAt: ts(23),
    lastUsedAt: null,
  },
  {
    id: 'default-025',
    title: 'UE5 关卡白盒 → 成品美术',
    category: 'UE5 Game Dev',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['UE5', '关卡设计', '环境美术'],
    description: '把灰盒关卡升级成成品环境美术的完整执行清单：资产、光照、氛围、性能。',
    chinesePrompt:
      '你是 UE5 环境美术师。我的关卡目前是灰盒（blockout）状态：{subject}。目标美术风格：{style}。请给我一份从白盒到成品的执行清单：\n1. 资产替换优先级（先替换什么最提升观感）；\n2. Lumen 光照方案（主光源、补光、雾效参数建议）；\n3. 氛围层（后处理体积、颗粒、色调映射的具体参数起点）；\n4. 材质技巧（顶点绘制、贴花、边缘磨损）；\n5. 性能预算检查点（Nanite 网格数、光照复杂度、目标帧率验证方法）。',
    englishPrompt:
      'You are a UE5 environment artist. My level is currently in blockout state: {subject}. Target art style: {style}. Give me a blockout-to-final execution checklist:\n1. Asset replacement priority (what to swap first for maximum visual gain);\n2. Lumen lighting plan (key light, fill, fog parameter starting points);\n3. Atmosphere layer (post-process volume, grain, tone mapping starting values);\n4. Material techniques (vertex painting, decals, edge wear);\n5. Performance budget checkpoints (Nanite mesh counts, lighting complexity, how to verify target framerate).',
    shortPrompt: 'UE5 blockout-to-final checklist for level {subject}, style {style}.',
    strongPrompt:
      'ROLE: UE5 environment artist.\nINPUT: blockout level — {subject}. TARGET STYLE: {style}.\nOUTPUT (mandatory sections, each with concrete parameter starting values):\n## Asset Swap Priority\n## Lumen Lighting Plan\n## Post-Process & Atmosphere\n## Material Techniques\n## Performance Budget & Verification\nRULE: every suggestion must include the exact editor path or parameter name.',
    negativePrompt: '',
    variables: ['subject', 'style'],
    usageNotes: '适合 neon-district-ue5 这类项目从灰盒推进到可截图状态时用。',
    isFavorite: false,
    createdAt: ts(24),
    updatedAt: ts(24),
    lastUsedAt: null,
  },

  /* ============ JSON Reverse Engineering ============ */
  {
    id: 'default-026',
    title: '图片全要素反推 JSON',
    category: 'JSON Reverse Engineering',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['反推', 'JSON', '图像分析'],
    description: '把一张图完整反推成结构化 JSON：人物、服装、姿势、光照、相机、色板、风格词。',
    chinesePrompt:
      '分析附图，把它完整反推为结构化 JSON，字段如下：\n{\n  "subject": { "age_range", "gender", "expression", "gaze" },\n  "outfit": [ { "item", "color", "material", "fit" } ],\n  "hair": { "color", "length", "texture", "styling" },\n  "pose": "",\n  "lighting": { "type", "direction", "mood" },\n  "camera": { "angle", "focal_length_estimate", "depth_of_field" },\n  "environment": "",\n  "color_palette": ["#hex"],\n  "style_keywords": [],\n  "suggested_prompt": ""\n}\n只输出合法 JSON，不要任何解释。所有值用英文，便于直接喂给生图模型。',
    englishPrompt:
      'Analyze the attached image and reverse-engineer it into structured JSON with exactly these fields:\n{\n  "subject": { "age_range", "gender", "expression", "gaze" },\n  "outfit": [ { "item", "color", "material", "fit" } ],\n  "hair": { "color", "length", "texture", "styling" },\n  "pose": "",\n  "lighting": { "type", "direction", "mood" },\n  "camera": { "angle", "focal_length_estimate", "depth_of_field" },\n  "environment": "",\n  "color_palette": ["#hex"],\n  "style_keywords": [],\n  "suggested_prompt": ""\n}\nOutput valid JSON only, no commentary. All values in English, ready to feed into an image model.',
    shortPrompt: 'Reverse-engineer attached image into full structured JSON (subject/outfit/hair/pose/lighting/camera/palette).',
    strongPrompt:
      'TASK: image → JSON reverse engineering.\nOUTPUT: valid JSON ONLY. No markdown fences, no commentary, no trailing commas.\nSCHEMA: subject{age_range,gender,expression,gaze}, outfit[{item,color,material,fit}], hair{color,length,texture,styling}, pose, lighting{type,direction,mood}, camera{angle,focal_length_estimate,depth_of_field}, environment, color_palette[hex], style_keywords[], suggested_prompt.\nRULES:\n1. Be specific: "dusty rose silk blouse, relaxed fit" not "pink top".\n2. color_palette: 5 dominant hex values.\n3. suggested_prompt: one paragraph usable directly in Midjourney.',
    negativePrompt: '',
    variables: [],
    usageNotes: '反推结果可以直接存回本库（新建提示词粘贴 JSON），形成"图→JSON→再生成"的闭环。',
    isFavorite: true,
    createdAt: ts(25),
    updatedAt: ts(25),
    lastUsedAt: null,
  },
  {
    id: 'default-027',
    title: 'Outfit-only JSON（只反推服装）',
    category: 'JSON Reverse Engineering',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['反推', 'JSON', '服装'],
    description: '只提取图中人物的服装信息为 JSON，用于换装工作流。',
    chinesePrompt:
      '只分析附图中人物的服装，输出 JSON：\n{\n  "outfit": [ { "item": "", "color": "", "material": "", "fit": "", "details": "" } ],\n  "accessories": [ { "item": "", "position": "" } ],\n  "shoes": { "type": "", "color": "" },\n  "overall_style": "",\n  "outfit_prompt": ""\n}\n忽略人物长相、姿势、背景。outfit_prompt 字段输出一段可直接用于换装的英文描述。只输出合法 JSON。',
    englishPrompt:
      'Analyze ONLY the outfit of the person in the attached image. Output JSON:\n{\n  "outfit": [ { "item": "", "color": "", "material": "", "fit": "", "details": "" } ],\n  "accessories": [ { "item": "", "position": "" } ],\n  "shoes": { "type": "", "color": "" },\n  "overall_style": "",\n  "outfit_prompt": ""\n}\nIgnore face, pose and background. The outfit_prompt field must be one English paragraph directly usable in an outfit-swap prompt. Output valid JSON only.',
    shortPrompt: 'Extract outfit-only JSON from attached image, with a ready-to-use outfit_prompt field.',
    strongPrompt:
      'TASK: outfit-only extraction.\nOUTPUT: valid JSON only, schema: outfit[{item,color,material,fit,details}], accessories[{item,position}], shoes{type,color}, overall_style, outfit_prompt.\nRULES:\n1. IGNORE face/pose/background entirely.\n2. Per-garment precision: exact color names, material guess, fit description.\n3. outfit_prompt: paste-ready for the outfit-swap template.',
    negativePrompt: '',
    variables: [],
    usageNotes: '与"换装（脸和背景锁定）"模板配对：反推出 outfit_prompt 后直接填进那边的 {style}。',
    isFavorite: false,
    createdAt: ts(26),
    updatedAt: ts(26),
    lastUsedAt: null,
  },
  {
    id: 'default-028',
    title: 'Hairstyle-only JSON（只反推发型）',
    category: 'JSON Reverse Engineering',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['反推', 'JSON', '发型'],
    description: '只提取图中人物的发型信息为 JSON，用于换发型工作流。',
    chinesePrompt:
      '只分析附图中人物的发型，输出 JSON：\n{\n  "hair": {\n    "color": "",\n    "color_technique": "",\n    "length": "",\n    "texture": "",\n    "volume": "",\n    "parting": "",\n    "bangs": "",\n    "styling": "",\n    "accessories": []\n  },\n  "hairstyle_prompt": ""\n}\n忽略长相、服装、背景。color_technique 指染发工艺（如挑染/渐变/布丁头）。hairstyle_prompt 输出一段可直接用于换发型的英文描述。只输出合法 JSON。',
    englishPrompt:
      'Analyze ONLY the hairstyle of the person in the attached image. Output JSON:\n{\n  "hair": {\n    "color": "",\n    "color_technique": "",\n    "length": "",\n    "texture": "",\n    "volume": "",\n    "parting": "",\n    "bangs": "",\n    "styling": "",\n    "accessories": []\n  },\n  "hairstyle_prompt": ""\n}\nIgnore face, outfit and background. color_technique means dye technique (highlights / gradient / grown-out roots). hairstyle_prompt must be one English paragraph directly usable in a hairstyle-swap prompt. Output valid JSON only.',
    shortPrompt: 'Extract hairstyle-only JSON from attached image, with ready-to-use hairstyle_prompt field.',
    strongPrompt:
      'TASK: hairstyle-only extraction.\nOUTPUT: valid JSON only, schema: hair{color,color_technique,length,texture,volume,parting,bangs,styling,accessories[]}, hairstyle_prompt.\nRULES:\n1. IGNORE face/outfit/background.\n2. Describe dye technique precisely (balayage, gradient, root shadow...).\n3. hairstyle_prompt: paste-ready paragraph for hair-swap editing.',
    negativePrompt: '',
    variables: [],
    usageNotes: 'K-pop 发型参考神器：直拍截图→反推 JSON→套到自己的角色上。',
    isFavorite: false,
    createdAt: ts(27),
    updatedAt: ts(27),
    lastUsedAt: null,
  },
  {
    id: 'default-029',
    title: '场景光影反推 JSON',
    category: 'JSON Reverse Engineering',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['反推', 'JSON', '光影', '场景'],
    description: '反推一张图的场景与光影设置为 JSON，可用于复刻同款打光。',
    chinesePrompt:
      '只分析附图的场景和光影（忽略人物长相和服装细节），输出 JSON：\n{\n  "environment": { "location", "time_of_day", "weather", "key_props": [] },\n  "lighting": { "key_light": { "type", "direction", "color" }, "fill_light", "rim_light", "practical_lights": [], "contrast_ratio", "mood" },\n  "color_grade": { "temperature", "tint", "palette": ["#hex"], "reference_style" },\n  "camera": { "angle", "height", "focal_length_estimate", "depth_of_field" },\n  "lighting_prompt": ""\n}\nlighting_prompt 输出一段可直接复刻这套光影的英文描述。只输出合法 JSON。',
    englishPrompt:
      'Analyze ONLY the scene and lighting of the attached image (ignore the person\'s face and outfit details). Output JSON:\n{\n  "environment": { "location", "time_of_day", "weather", "key_props": [] },\n  "lighting": { "key_light": { "type", "direction", "color" }, "fill_light", "rim_light", "practical_lights": [], "contrast_ratio", "mood" },\n  "color_grade": { "temperature", "tint", "palette": ["#hex"], "reference_style" },\n  "camera": { "angle", "height", "focal_length_estimate", "depth_of_field" },\n  "lighting_prompt": ""\n}\nlighting_prompt must be one English paragraph that reproduces this exact lighting setup. Output valid JSON only.',
    shortPrompt: 'Extract scene + lighting JSON from attached image, with reproducible lighting_prompt.',
    strongPrompt:
      'TASK: scene & lighting extraction.\nOUTPUT: valid JSON only. Schema: environment{location,time_of_day,weather,key_props[]}, lighting{key_light{type,direction,color},fill_light,rim_light,practical_lights[],contrast_ratio,mood}, color_grade{temperature,tint,palette[],reference_style}, camera{angle,height,focal_length_estimate,depth_of_field}, lighting_prompt.\nRULES:\n1. Identify every visible light source including practicals (neon signs, lamps, screens).\n2. reference_style: name a film/photographer if the grade resembles one.\n3. lighting_prompt: paste-ready to clone this look.',
    negativePrompt: '',
    variables: [],
    usageNotes: '拿到喜欢的电影截图/摄影作品时用它扒光影配方，再套用到自己的生图或 relight 模板。',
    isFavorite: false,
    createdAt: ts(28),
    updatedAt: ts(28),
    lastUsedAt: null,
  },

  /* ============ Video Prompt ============ */
  {
    id: 'default-030',
    title: '产品广告 15 秒分镜脚本',
    category: 'Video Prompt',
    platform: 'Kling / Runway',
    tags: ['视频', '分镜', '广告', '15秒'],
    description: '为产品生成 15 秒短视频广告的分镜脚本：镜头/时长/运镜/画面/音效逐条列出。',
    chinesePrompt:
      '为 {object} 写一个 15 秒的 {platform} 广告分镜脚本，目标人群是 {subject}。输出表格：镜头编号 / 时长（秒）/ 画面内容 / 运镜方式 / 音效或BGM点 / 字幕文案。要求：前 2 秒必须有钩子，产品特写不少于 2 个镜头，最后 2 秒是行动号召。每个镜头的画面描述要具体到可以直接作为 AI 生视频的提示词使用。',
    englishPrompt:
      'Write a 15-second {platform} ad storyboard for {object}, targeting {subject}. Output a table: shot number / duration (s) / visual content / camera movement / sound cue / caption text. Requirements: a hook within the first 2 seconds, at least 2 product close-up shots, and a call-to-action in the final 2 seconds. Each shot\'s visual description must be specific enough to use directly as an AI video generation prompt.',
    shortPrompt: '15s ad storyboard for {object} on {platform}: shots, camera moves, sound cues, CTA.',
    strongPrompt:
      'TASK: 15-second ad storyboard.\nPRODUCT: {object}. PLATFORM: {platform}. AUDIENCE: {subject}.\nOUTPUT: markdown table — Shot# | Duration | Visual (AI-video-prompt ready) | Camera | Sound | Caption.\nHARD RULES:\n1. Hook lands within 0-2s.\n2. ≥2 product close-ups.\n3. Final 2s = CTA.\n4. Total = exactly 15s.\n5. Visual column: concrete nouns + lighting + movement, no vague adjectives.',
    negativePrompt: '',
    variables: ['object', 'platform', 'subject'],
    usageNotes: '每个镜头的"画面内容"可以单独复制去即梦/Kling 生成，再剪到一起。',
    isFavorite: false,
    createdAt: ts(29),
    updatedAt: ts(29),
    lastUsedAt: null,
  },
  {
    id: 'default-031',
    title: '图生视频运镜提示词',
    category: 'Video Prompt',
    platform: 'Kling / Runway',
    tags: ['图生视频', '运镜', 'I2V'],
    description: '把一张静态图变成有电影感运镜的短视频：主体动作+镜头运动+氛围变化分层描述。',
    chinesePrompt:
      '基于这张图生成 5 秒视频。分层描述：\n主体动作：{subject} 做出 {object} 的动作，幅度自然、不夸张；\n镜头运动：{style}（例如：缓慢推近 / 环绕四分之一圈 / 手持轻微晃动）；\n氛围变化：光线和环境的细微流动（如霓虹闪烁、发丝被风吹动、雾气飘移）；\n约束：人物五官和服装保持稳定不变形，运动要连贯丝滑，无跳帧。',
    englishPrompt:
      'Generate a 5-second video from this image. Layered description:\nSubject motion: {subject} performs {object}, natural amplitude, not exaggerated;\nCamera movement: {style} (e.g. slow push-in / quarter orbit / subtle handheld sway);\nAmbient motion: subtle light and environment flow (neon flicker, hair moved by wind, drifting haze);\nConstraints: facial features and outfit stay stable without warping, motion must be smooth and continuous, no frame jumps.',
    shortPrompt: 'I2V: {subject} does {object}, camera {style}, ambient motion subtle, face stable.',
    strongPrompt:
      'TASK: image-to-video, 5s.\nLAYERS:\n1. SUBJECT: {subject} → action: {object} (natural amplitude).\n2. CAMERA: {style}.\n3. AMBIENT: neon flicker / hair in wind / haze drift — subtle only.\nSTABILITY RULES: zero face warping, zero outfit morphing, no extra limbs appearing, smooth continuous motion, loop-friendly ending preferred.',
    negativePrompt: 'face warping, morphing clothes, extra limbs, jerky motion, frame jumps, drastic lighting change',
    variables: ['subject', 'object', 'style'],
    usageNotes: '动作和运镜别同时太大，二选一做主角，另一个收着，成功率高很多。',
    isFavorite: false,
    createdAt: ts(30),
    updatedAt: ts(30),
    lastUsedAt: null,
  },

  /* ============ Workplace Feedback ============ */
  {
    id: 'default-032',
    title: '工作反馈文案（专业得体版）',
    category: 'Workplace Feedback',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['职场', '文案', '沟通'],
    description: '把想说的大白话改写成专业、得体、不卑不亢的工作反馈。',
    chinesePrompt:
      '把下面这段话改写成 {tone} 风格的工作反馈，发送对象是 {subject}，发送渠道是 {platform}：\n\n"{object}"\n\n要求：保留我要表达的核心事实和诉求，去掉情绪化表达；语气专业、得体、不卑不亢；如果内容包含负面反馈，用"事实 + 影响 + 建议"的结构呈现；长度控制在 150 字以内；给出 2 个版本供我选择。',
    englishPrompt:
      'Rewrite the following message as {tone} workplace feedback, addressed to {subject}, to be sent via {platform}:\n\n"{object}"\n\nRequirements: keep my core facts and requests, remove emotional wording; tone must be professional, tactful and self-respecting; if it contains negative feedback, structure it as "fact + impact + suggestion"; keep it under 120 words; provide 2 versions for me to choose from.',
    shortPrompt: 'Rewrite "{object}" as professional {tone} feedback to {subject} via {platform}, 2 versions.',
    strongPrompt:
      'TASK: workplace feedback rewrite.\nRAW MESSAGE: "{object}"\nRECIPIENT: {subject}. CHANNEL: {platform}. TONE: {tone}.\nRULES:\n1. Preserve every factual claim and request; delete emotional language.\n2. Negative feedback → fact + impact + suggestion structure.\n3. ≤150 Chinese characters (or 120 English words).\n4. Output exactly 2 labeled versions: 【版本A 直接】【版本B 缓和】.\n5. No corporate clichés, no excessive apologizing.',
    negativePrompt: '',
    variables: ['object', 'subject', 'platform', 'tone'],
    usageNotes: '{object} 填你想说的原话（可以带情绪），{tone} 如"坚定但友好"。给甲方回怼前先过一遍这个模板。',
    isFavorite: true,
    createdAt: ts(31),
    updatedAt: ts(31),
    lastUsedAt: null,
  },
  {
    id: 'default-033',
    title: '周报 / 复盘总结生成',
    category: 'Workplace Feedback',
    platform: 'ChatGPT / Claude / Fable',
    tags: ['周报', '复盘', '总结'],
    description: '把流水账工作记录整理成结构化周报：成果量化+问题+下周计划。',
    chinesePrompt:
      '把下面的工作流水账整理成一份结构化周报，风格 {tone}：\n\n"{object}"\n\n输出结构：\n1. 本周核心成果（每条尽量量化，突出结果而非过程）；\n2. 遇到的问题与解决方式（最多 3 条）；\n3. 下周计划（按优先级排序）；\n4. 需要的支持（如果有）。\n要求：不夸大、不堆砌形容词，让没跟进项目的人 1 分钟能看懂。',
    englishPrompt:
      'Organize the following raw work log into a structured weekly report, tone: {tone}:\n\n"{object}"\n\nOutput structure:\n1. Key results this week (quantify each item, emphasize outcomes over process);\n2. Problems encountered and how they were solved (max 3);\n3. Next week\'s plan (sorted by priority);\n4. Support needed (if any).\nRequirements: no exaggeration, no adjective stacking; someone unfamiliar with the project must understand it in 1 minute.',
    shortPrompt: 'Turn raw work log "{object}" into a structured weekly report, tone {tone}.',
    strongPrompt:
      'TASK: weekly report generation.\nRAW LOG: "{object}"\nTONE: {tone}.\nOUTPUT SECTIONS (mandatory): ## 核心成果 (quantified bullets) / ## 问题与解决 (≤3) / ## 下周计划 (priority-ordered) / ## 需要支持.\nRULES:\n1. Every achievement gets a number where possible (count, %, time saved).\n2. Zero filler adjectives.\n3. 1-minute readable by an outsider.\n4. Honest: unfinished items stay unfinished, framed with next steps.',
    negativePrompt: '',
    variables: ['object', 'tone'],
    usageNotes: '平时随手记流水账，周五扔进 {object} 一键出周报。',
    isFavorite: false,
    createdAt: ts(32),
    updatedAt: ts(32),
    lastUsedAt: null,
  },
]
