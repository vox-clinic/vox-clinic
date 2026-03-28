import ffmpeg from 'fluent-ffmpeg'
import { Readable, PassThrough } from 'stream'
import path from 'path'

// Resolve ffmpeg binary path
// In Docker/production: use system ffmpeg installed via apk
// In development: use ffmpeg-static from node_modules
function resolveFfmpegPath(): string {
  // Check system ffmpeg first (Docker with apk add ffmpeg)
  const { execSync } = require('child_process')
  try {
    const systemPath = execSync('which ffmpeg', { encoding: 'utf-8' }).trim()
    if (systemPath) return systemPath
  } catch {
    // System ffmpeg not found, try ffmpeg-static
  }
  // Fallback to ffmpeg-static
  try {
    const ffmpegStatic = require('ffmpeg-static')
    if (ffmpegStatic) return ffmpegStatic
  } catch {
    // ffmpeg-static not available, use last resort path
  }
  // Last resort: node_modules path
  return path.join(process.cwd(), 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
}
ffmpeg.setFfmpegPath(resolveFfmpegPath())

interface PreprocessOptions {
  speed?: number        // 1.0 - 2.0, default 1.4
  removeSilence?: boolean  // default true
  targetSampleRate?: number // default 16000
  targetBitrate?: string   // default '64k'
}

export async function preprocessAudio(
  inputBuffer: Buffer,
  filename: string,
  options: PreprocessOptions = {}
): Promise<{ buffer: Buffer; originalDuration: number | null; processedDuration: number | null }> {
  const {
    speed = 1.4,
    removeSilence = true,
    targetSampleRate = 16000,
    targetBitrate = '64k',
  } = options

  const FFMPEG_TIMEOUT_MS = 30_000

  return new Promise((resolve, reject) => {
    const inputStream = Readable.from(inputBuffer)
    const chunks: Buffer[] = []
    const output = new PassThrough()
    let settled = false

    // Timeout: kill ffmpeg if it hangs
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        try { command.kill('SIGKILL') } catch (killErr) {
          console.error('[audio-preprocessing] Failed to kill ffmpeg process', killErr)
        }
        reject(new Error('FFmpeg timeout: processamento de audio excedeu 30s'))
      }
    }, FFMPEG_TIMEOUT_MS)

    output.on('data', (chunk: Buffer) => chunks.push(chunk))
    output.on('end', () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve({
          buffer: Buffer.concat(chunks),
          originalDuration: null,
          processedDuration: null,
        })
      }
    })
    output.on('error', (err) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(err)
      }
    })

    // Build audio filter chain
    const filters: string[] = []

    if (removeSilence) {
      filters.push('silenceremove=stop_periods=-1:stop_duration=0.5:stop_threshold=-30dB:stop_silence=0.15')
    }

    if (speed > 1.0 && speed <= 2.0) {
      filters.push(`atempo=${speed}`)
    } else if (speed > 2.0) {
      filters.push(`atempo=2.0`)
      filters.push(`atempo=${speed / 2.0}`)
    }

    const command = ffmpeg(inputStream)
      .inputFormat(getInputFormat(filename))
      .audioChannels(1)
      .audioFrequency(targetSampleRate)
      .audioBitrate(targetBitrate)
      .format('mp3')

    if (filters.length > 0) {
      command.audioFilters(filters)
    }

    command
      .on('error', (err: Error) => {
        if (!settled) {
          settled = true
          clearTimeout(timer)
          reject(new Error(`FFmpeg error: ${err.message}`))
        }
      })
      .pipe(output, { end: true })
  })
}

function getInputFormat(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'webm'
  const formatMap: Record<string, string> = {
    webm: 'webm',
    mp3: 'mp3',
    mp4: 'mp4',
    m4a: 'mp4',
    wav: 'wav',
    ogg: 'ogg',
    flac: 'flac',
  }
  return formatMap[ext] ?? 'webm'
}
