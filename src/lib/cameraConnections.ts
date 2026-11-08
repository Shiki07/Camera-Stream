// Shared record of which camera feeds are currently connected (in-memory only)
export const connectedCameraIds = new Set<string>();
export const CAMERA_CONNECTION_EVENT = 'camera-connection-changed';

export const reportCameraConnection = (cameraId: string, connected: boolean) => {
  if (connected) connectedCameraIds.add(cameraId); else connectedCameraIds.delete(cameraId);
  window.dispatchEvent(new CustomEvent(CAMERA_CONNECTION_EVENT, { detail: { cameraId, connected } }));
};
