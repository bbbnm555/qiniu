import { create } from "zustand";

interface MediaDevice {
  deviceId: string;
  label: string;
}

interface MediaState {
  /** 摄像头流 */
  cameraStream: MediaStream | null;
  /** 是否正在采集 */
  isCapturing: boolean;
  /** 帧捕获是否激活 */
  isFrameCaptureActive: boolean;
  /** 可用摄像头列表 */
  cameras: MediaDevice[];
  /** 可用麦克风列表 */
  microphones: MediaDevice[];
  /** 当前选中的摄像头 ID */
  selectedCameraId: string | null;
  /** 当前选中的麦克风 ID */
  selectedMicId: string | null;

  setCameraStream: (stream: MediaStream | null) => void;
  setIsCapturing: (v: boolean) => void;
  setIsFrameCaptureActive: (v: boolean) => void;
  setCameras: (devices: MediaDevice[]) => void;
  setMicrophones: (devices: MediaDevice[]) => void;
  setSelectedCameraId: (id: string | null) => void;
  setSelectedMicId: (id: string | null) => void;
  /** 停止所有采集 */
  stopAll: () => void;
}

export const useMediaStore = create<MediaState>((set, get) => ({
  cameraStream: null,
  isCapturing: false,
  isFrameCaptureActive: false,
  cameras: [],
  microphones: [],
  selectedCameraId: null,
  selectedMicId: null,

  setCameraStream: (stream) => set({ cameraStream: stream }),
  setIsCapturing: (v) => set({ isCapturing: v }),
  setIsFrameCaptureActive: (v) => set({ isFrameCaptureActive: v }),
  setCameras: (devices) => set({ cameras: devices }),
  setMicrophones: (devices) => set({ microphones: devices }),
  setSelectedCameraId: (id) => set({ selectedCameraId: id }),
  setSelectedMicId: (id) => set({ selectedMicId: id }),

  stopAll: () => {
    const { cameraStream } = get();
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
    set({
      cameraStream: null,
      isCapturing: false,
      isFrameCaptureActive: false,
    });
  },
}));
