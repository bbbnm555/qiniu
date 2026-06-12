/**
 * 音频采集工具
 *
 * 作为浏览器 SpeechRecognition 的降级方案，
 * 使用 MediaRecorder 录制音频并通过 WebSocket 发送到后端做 ASR
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private onDataAvailable: ((blob: Blob) => void) | null = null;

  /**
   * 开始录音
   * @param stream 麦克风轨道所在的 MediaStream
   * @param onChunk 每次产生音频片段时的回调
   */
  start(stream: MediaStream, onChunk: (blob: Blob) => void): void {
    this.onDataAvailable = onChunk;
    this.chunks = [];

    // 提取音频轨道
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      throw new Error("未找到音频轨道");
    }

    const audioStream = new MediaStream([audioTrack]);

    // 优先使用 opus 编码（webm 容器）
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.mediaRecorder = new MediaRecorder(audioStream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.onDataAvailable?.(event.data);
      }
    };

    // 每 500ms 产生一个数据块（降低延迟）
    this.mediaRecorder.start(500);
  }

  /** 停止录音，返回完整 Blob */
  stop(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(new Blob());
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });
        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }
}
