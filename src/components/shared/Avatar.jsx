import { AVATARS } from '../../constants/avatars'

export default function Avatar({ avatarId, size = 40, className = '' }) {
  const avatar = AVATARS.find((a) => a.id === avatarId) ?? AVATARS[0]
  return (
    <img
      src={avatar.src}
      alt={avatar.label}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%', objectFit: 'cover' }}
    />
  )
}
