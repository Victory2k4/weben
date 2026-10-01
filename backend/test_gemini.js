const { GoogleGenerativeAI } = require('@google/generative-ai'); 
require('dotenv').config(); 
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
async function run() { 
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash', generationConfig: { responseMimeType: 'application/json' } }); 
  const prompt = `Parse this vocab list into a JSON array of objects with exact keys: term, phonetic, part_of_speech, definition, example_sentence. If missing, use "". Keep original order. Do not invent details. Raw text: \nTừ vựngLoại từNghĩa tiếng Việtsecurity Danh từSự an ninh, bảo mậtdata Danh từDữ liệupassword Danh từMật khẩunetwork Danh từMạng lưới máy tínhalphanumeric Tính từChứa cả chữ và sốcharacter Danh từKý tựcolleague Danh từĐồng nghiệpconnect Động từKết nốipersonal Tính từCá nhân, riêng tưdownload Động từTải xuốngstream Động từPhát trực tuyếnchairperson Danh từChủ tọa cuộc họpagenda Danh từChương trình nghị sựminutes Danh từ số nhiềuBiên bản cuộc họpteleconference Danh từHội nghị từ xavideoconference Danh từHội nghị truyền hình trực tuyến`; 
  try { 
    const result = await model.generateContent(prompt); 
    console.log("RESPONSE:", result.response.text()); 
  } catch (e) { 
    console.error("ERROR:", e) 
  } 
} 
run();
