import { createContext, useContext } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { Player } from '../api/types'
import catCharacter from '../assets/characters/noopi-cat.png'
import dogCharacter from '../assets/characters/noopi-dog.png'
import animalDuo from '../assets/characters/noopi-animal-duo.png'

export function Page({ children, className = '' }: { children: ReactNode; className?: string }) { return <main className={`page ${className}`}><div className="ambient ambientOne" /><div className="ambient ambientTwo" /><section className="phone">{children}</section></main> }
export function Brand() { return <div className="brand"><span className="brandMark">N</span><span>NOOPI</span></div> }
export function CharacterStage({ compact = false }: { compact?: boolean }) { return <div className={`characterStage ${compact ? 'compact' : ''}`} aria-hidden><span className="neonDoodle neonDoodleLeft">✦</span><img className="animalDuo" src={animalDuo} alt="" /><span className="neonDoodle neonDoodleRight">⌁</span></div> }
export function Button({ className = '', children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`button ${className}`} {...props}>{children}</button> }
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <div className={`card ${className}`}>{children}</div> }
export function Back({ onClick }: { onClick: () => void }) { return <button className="iconButton" onClick={onClick} aria-label="뒤로 가기">←</button> }
const PlayerGenderContext = createContext<Player[]>([])
export function PlayerGenderProvider({ players, children }: { players: Player[]; children: ReactNode }) { return <PlayerGenderContext.Provider value={players}>{children}</PlayerGenderContext.Provider> }
export function Avatar({ name, gender }: { name?: string; gender?: 'MALE' | 'FEMALE' }) { const players = useContext(PlayerGenderContext); const resolvedGender = gender ?? players.find(player => player.nickname === name)?.gender; const source = resolvedGender === 'FEMALE' ? dogCharacter : catCharacter; return <span className={`avatar ${resolvedGender === 'FEMALE' ? 'pink' : ''}`} aria-hidden><img src={source} alt="" /></span> }
export function Progress({ value, max }: { value: number; max: number }) { return <div className="progress" aria-label={`${max}명 중 ${value}명 완료`}><i style={{ width: `${Math.min(100, value / max * 100)}%` }} /></div> }
export function SpinnerText({ children }: { children: ReactNode }) { return <div className="waiting"><span className="dots">•••</span><p>{children}</p></div> }
