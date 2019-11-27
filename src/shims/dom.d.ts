interface NavigatorUserMedia {
  getDisplayMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
}
