export type LocalUpdaterInstallMode =
  | 'interactive'
  | 'supervised-headless-serve'
  | 'unsupported-headless-serve'

// This custom desktop build checks for releases but never downloads or installs them locally.
export const LOCAL_UPDATER_NOTIFICATION_ONLY = true

export function shouldAllowUpdaterInstallation(
  notificationOnly: boolean,
  installMode: LocalUpdaterInstallMode
): boolean {
  return !notificationOnly || installMode !== 'interactive'
}
