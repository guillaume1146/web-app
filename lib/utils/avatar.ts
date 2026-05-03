const PALETTE = ['#0C6780', '#001E40', '#0a5c73', '#1a6b8a', '#0e4a6b']

export function initialsAvatar(firstName: string, lastName: string): string {
  const initials = `${firstName[0] ?? '?'}${lastName[0] ?? ''}`.toUpperCase()
  const bg = PALETTE[(firstName.charCodeAt(0) + (lastName.charCodeAt(0) || 0)) % PALETTE.length]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="${bg}"/><text x="20" y="26" text-anchor="middle" fill="white" font-size="15" font-family="Arial,sans-serif" font-weight="bold">${initials}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function avatarSrc(profileImage: string | null | undefined, firstName: string, lastName: string): string {
  return profileImage || initialsAvatar(firstName, lastName)
}
