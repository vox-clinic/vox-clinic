import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  const file = new File([new Uint8Array(audioBuffer)], filename, { type: 'audio/webm' })
  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
  })
  return response.text
}
