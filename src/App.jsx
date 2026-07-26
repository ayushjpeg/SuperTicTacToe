import { useEffect, useMemo, useState } from 'react'
import {
  acceptInvite,
  cancelInvite,
  createBotGame,
  createInvite,
  fetchActivePlayers,
  fetchGame,
  fetchGames,
  fetchIncomingInvites,
  fetchInviteByCode,
  fetchOutgoingInvites,
  heartbeatPresence,
  submitMove,
} from './api/gameApi'

const moveKey = (move) => `${move.board_row}-${move.board_col}-${move.cell_row}-${move.cell_col}`
const NUMBER_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const toDisplayName = (user) => user?.full_name || user?.email?.split('@')[0] || 'Player'

const getSubgridAvailableValues = (boardState, boardRow, boardCol) => {
  const used = new Set()
  const subgrid = boardState?.[boardRow]?.[boardCol] || []
  for (const row of subgrid) {
    for (const value of row || []) {
      if (value != null) {
        used.add(Number(value))
      }
    }
  }
  return NUMBER_RANGE.filter((value) => !used.has(value))
}

const getLegalNumberChoices = (game) => {
  if (!game) return NUMBER_RANGE
  const choices = new Set()
  for (const move of game.legal_moves || []) {
    const options = getSubgridAvailableValues(game.board_state, move.board_row, move.board_col)
    for (const value of options) choices.add(value)
  }
  return NUMBER_RANGE.filter((value) => choices.has(value))
}

const getBotMoveSourceLabel = (game) => {
  if (!game || game.mode !== 'bot') return ''
  const lastMove = game.last_move_json || {}
  if (!game.bot_symbol || lastMove.symbol !== game.bot_symbol) return ''

  if (lastMove.source === 'model') return 'Bot source: model policy'
  if (lastMove.source === 'random_fallback') return 'Bot source: random fallback'
  return 'Bot source: unknown'
}

function PlayerBadge({ user, symbol, isBot }) {
  if (isBot) {
    return (
      <div className="badge">
        <span className="badge__symbol">{symbol}</span>
        <span className="badge__name">BOT</span>
      </div>
    )
  }
  if (!user) {
    return (
      <div className="badge badge--empty">
        <span className="badge__symbol">{symbol}</span>
        <span className="badge__name">Waiting...</span>
      </div>
    )
  }
  return (
    <div className="badge">
      <span className="badge__symbol">{symbol}</span>
      <span className="badge__name">{toDisplayName(user)}</span>
    </div>
  )
}

function GameBoard({ game, selectedValue, onPlay }) {
  const legalMoveSet = useMemo(() => new Set((game?.legal_moves || []).map(moveKey)), [game])
  const canMove = game?.status === 'active' && game?.you_symbol && game?.you_symbol === game?.current_player

  return (
    <div className="board">
      {Array.from({ length: 3 }).map((_, boardRow) => (
        <div className="board__row" key={`r-${boardRow}`}>
          {Array.from({ length: 3 }).map((_, boardCol) => {
            const subWinner = game?.subgrid_state?.[boardRow]?.[boardCol]
            const isTargeted = game?.next_board_row === boardRow && game?.next_board_col === boardCol
            const isGlobalFreeMove = game?.next_board_row == null || game?.next_board_col == null
            const winnerClass = subWinner === 'X'
              ? 'subgrid--won-x'
              : (subWinner === 'O' ? 'subgrid--won-o' : (subWinner === 'D' ? 'subgrid--won-draw' : ''))
            return (
              <div
                key={`b-${boardRow}-${boardCol}`}
                className={`subgrid ${winnerClass} ${isTargeted ? 'subgrid--targeted' : ''} ${isGlobalFreeMove ? 'subgrid--free' : ''}`}
              >
                {subWinner && <div className="subgrid__winner">{subWinner === 'D' ? 'TIE' : subWinner}</div>}
                {Array.from({ length: 3 }).map((__, cellRow) => (
                  <div className="subgrid__row" key={`sr-${cellRow}`}>
                    {Array.from({ length: 3 }).map((___, cellCol) => {
                      const value = game?.board_state?.[boardRow]?.[boardCol]?.[cellRow]?.[cellCol]
                      const canPlaceInSubgrid = getSubgridAvailableValues(game?.board_state, boardRow, boardCol).includes(selectedValue)
                      const playable = canMove
                        && selectedValue != null
                        && canPlaceInSubgrid
                        && legalMoveSet.has(`${boardRow}-${boardCol}-${cellRow}-${cellCol}`)
                      return (
                        <button
                          key={`c-${boardRow}-${boardCol}-${cellRow}-${cellCol}`}
                          type="button"
                          className={`cell ${playable ? 'cell--playable' : ''} ${value != null ? 'cell--filled' : ''}`}
                          onClick={() => playable && onPlay({ board_row: boardRow, board_col: boardCol, cell_row: cellRow, cell_col: cellCol, value: selectedValue })}
                          disabled={!playable}
                        >
                          {value ?? ''}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [players, setPlayers] = useState([])
  const [incomingInvites, setIncomingInvites] = useState([])
  const [outgoingInvites, setOutgoingInvites] = useState([])
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [selectedTarget, setSelectedTarget] = useState('')
  const [inviteFromLink, setInviteFromLink] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedValue, setSelectedValue] = useState(null)

  const selectedGameId = selectedGame?.id || null
  const canPlayNow = selectedGame?.status === 'active' && selectedGame?.you_symbol && selectedGame?.you_symbol === selectedGame?.current_player
  const legalNumberChoices = useMemo(() => getLegalNumberChoices(selectedGame), [selectedGame])
  const botMoveSourceLabel = useMemo(() => getBotMoveSourceLabel(selectedGame), [selectedGame])

  const refreshLobby = async () => {
    const [activePlayers, incoming, outgoing, activeGames] = await Promise.all([
      fetchActivePlayers(),
      fetchIncomingInvites(),
      fetchOutgoingInvites(),
      fetchGames('active'),
    ])
    setPlayers(activePlayers)
    setIncomingInvites(incoming)
    setOutgoingInvites(outgoing)
    setGames(activeGames)
    if (!selectedGameId && activeGames.length) {
      setSelectedGame(activeGames[0])
    }
  }

  useEffect(() => {
    let canceled = false
    const run = async () => {
      try {
        await heartbeatPresence()
        if (canceled) return
        await refreshLobby()
      } catch (err) {
        if (!canceled) setMessage(err.message || 'Unable to load lobby')
      }
    }
    run()

    const heartbeatTimer = setInterval(() => {
      heartbeatPresence().catch(() => {})
    }, 20000)

    const lobbyTimer = setInterval(() => {
      refreshLobby().catch(() => {})
    }, 5000)

    return () => {
      canceled = true
      clearInterval(heartbeatTimer)
      clearInterval(lobbyTimer)
    }
  }, [])

  useEffect(() => {
    if (!selectedGameId) return
    let canceled = false

    const poll = async () => {
      try {
        const game = await fetchGame(selectedGameId)
        if (!canceled) setSelectedGame(game)
      } catch {
        // Ignore intermittent poll failures.
      }
    }

    poll()
    const timer = setInterval(poll, 1500)

    return () => {
      canceled = true
      clearInterval(timer)
    }
  }, [selectedGameId])

  useEffect(() => {
    const inviteCode = new URLSearchParams(window.location.search).get('invite')
    if (!inviteCode) return

    let canceled = false
    fetchInviteByCode(inviteCode)
      .then((invite) => {
        if (!canceled) setInviteFromLink(invite)
      })
      .catch(() => {
        if (!canceled) setMessage('Invite link is invalid or expired.')
      })

    return () => {
      canceled = true
    }
  }, [])

  const createInviteForTarget = async (targetUserId = null) => {
    setBusy(true)
    setMessage('')
    try {
      const invite = await createInvite({ target_user_id: targetUserId, expires_minutes: 30 })
      const shareLink = `${window.location.origin}/?invite=${invite.code}`
      try {
        await navigator.clipboard.writeText(shareLink)
        setMessage('Invite created. Share link copied to clipboard.')
      } catch {
        setMessage(`Invite created. Share this link: ${shareLink}`)
      }
      await refreshLobby()
    } catch (err) {
      setMessage(err.message || 'Failed to create invite')
    } finally {
      setBusy(false)
    }
  }

  const handleAcceptInvite = async (code) => {
    setBusy(true)
    setMessage('')
    try {
      const game = await acceptInvite(code)
      setSelectedGame(game)
      setInviteFromLink(null)
      setMessage('Invite accepted. Match started.')
      await refreshLobby()
    } catch (err) {
      setMessage(err.message || 'Unable to accept invite')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateBotGame = async (humanSymbol) => {
    setBusy(true)
    setMessage('')
    try {
      const game = await createBotGame(humanSymbol)
      setSelectedGame(game)
      setMessage('Bot game created.')
      await refreshLobby()
    } catch (err) {
      setMessage(err.message || 'Unable to create bot game')
    } finally {
      setBusy(false)
    }
  }

  const handleMove = async (move) => {
    if (!selectedGameId) return
    if (selectedValue == null) {
      setMessage('Select a number from 1-9 first.')
      return
    }
    try {
      const game = await submitMove(selectedGameId, move)
      setSelectedGame(game)
    } catch (err) {
      setMessage(err.message || 'Move failed')
    }
  }

  const activeOpponents = players.filter((item) => !item.is_self)

  return (
    <main className="arena">
      <section className="panel panel--lobby">
        <div className="panel__header">
          <h2>Live Lobby</h2>
          <span className="pill">{players.length} online</span>
        </div>

        <div className="lobby-list">
          {activeOpponents.map((entry) => (
            <div key={entry.user.id} className="lobby-card">
              <div>
                <p className="lobby-card__name">{toDisplayName(entry.user)}</p>
                <p className="lobby-card__email">{entry.user.email}</p>
              </div>
              <button disabled={busy} onClick={() => createInviteForTarget(entry.user.id)}>Invite</button>
            </div>
          ))}
          {!activeOpponents.length && <p className="empty">No other active players right now.</p>}
        </div>

        <div className="panel__group">
          <label htmlFor="target-select">Invite specific player</label>
          <select id="target-select" value={selectedTarget} onChange={(event) => setSelectedTarget(event.target.value)}>
            <option value="">Select player</option>
            {activeOpponents.map((entry) => (
              <option key={entry.user.id} value={entry.user.id}>{toDisplayName(entry.user)}</option>
            ))}
          </select>
          <button disabled={busy || !selectedTarget} onClick={() => createInviteForTarget(selectedTarget)}>Create targeted invite</button>
          <button disabled={busy} onClick={() => createInviteForTarget(null)}>Create open invite link</button>
        </div>

        <div className="panel__group">
          <p className="group-title">Incoming invites</p>
          {incomingInvites.map((invite) => (
            <div key={invite.id} className="invite-row">
              <span>{toDisplayName(invite.from_user)}</span>
              <button disabled={busy} onClick={() => handleAcceptInvite(invite.code)}>Accept</button>
            </div>
          ))}
          {!incomingInvites.length && <p className="empty">No pending invites.</p>}
        </div>

        <div className="panel__group">
          <p className="group-title">Outgoing invites</p>
          {outgoingInvites.slice(0, 5).map((invite) => (
            <div key={invite.id} className="invite-row">
              <span>{invite.status} • {invite.code}</span>
              {invite.status === 'pending' && (
                <button
                  onClick={async () => {
                    await cancelInvite(invite.id)
                    await refreshLobby()
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          ))}
          {!outgoingInvites.length && <p className="empty">No sent invites yet.</p>}
        </div>
      </section>

      <section className="panel panel--game">
        <div className="panel__header panel__header--wide">
          <div>
            <h1>Number Tic Tac Toe</h1>
            <p>Use numbers 1-9, keep each subgrid unique, and make 15-lines to claim boards.</p>
          </div>
          <div className="bot-actions">
            <button disabled={busy} onClick={() => handleCreateBotGame('X')}>Play bot as X</button>
            <button disabled={busy} onClick={() => handleCreateBotGame('O')}>Play bot as O</button>
          </div>
        </div>

        {inviteFromLink && inviteFromLink.status === 'pending' && (
          <div className="link-invite">
            <span>Invite from {toDisplayName(inviteFromLink.from_user)}</span>
            <button disabled={busy} onClick={() => handleAcceptInvite(inviteFromLink.code)}>Join from link</button>
          </div>
        )}

        {!!message && <p className="status">{message}</p>}

        <div className="number-bar">
          <p className="number-bar__label">Pick Number</p>
          <div className="number-bar__buttons">
            {NUMBER_RANGE.map((value) => {
              const allowed = legalNumberChoices.includes(value)
              const selected = selectedValue === value
              return (
                <button
                  key={value}
                  type="button"
                  className={`number-pill ${selected ? 'number-pill--selected' : ''}`}
                  onClick={() => setSelectedValue(value)}
                  disabled={!canPlayNow || !allowed}
                >
                  {value}
                </button>
              )
            })}
          </div>
        </div>

        <div className="match-strip">
          <PlayerBadge user={selectedGame?.player_x} symbol="X" isBot={selectedGame?.bot_symbol === 'X'} />
          <div className="match-strip__center">
            <p className="match-strip__turn">
              {selectedGame?.status === 'finished'
                ? (selectedGame?.winner === 'D' ? 'Draw' : `${selectedGame?.winner} wins`)
                : (selectedGame ? `${selectedGame.current_player} to move` : 'Select or create a match')}
            </p>
            <p className="match-strip__hint">
              {selectedGame?.next_board_row == null ? 'Free move anywhere' : `Must play in board ${selectedGame.next_board_row + 1}-${selectedGame.next_board_col + 1}`}
            </p>
            {!!botMoveSourceLabel && <p className="match-strip__engine">{botMoveSourceLabel}</p>}
          </div>
          <PlayerBadge user={selectedGame?.player_o} symbol="O" isBot={selectedGame?.bot_symbol === 'O'} />
        </div>

        {selectedGame ? (
          <GameBoard game={selectedGame} selectedValue={selectedValue} onPlay={handleMove} />
        ) : (
          <div className="empty-game">Pick an active game or start one from the lobby.</div>
        )}

        <div className="games-row">
          {games.map((game) => (
            <button
              key={game.id}
              className={`game-chip ${selectedGameId === game.id ? 'game-chip--active' : ''}`}
              onClick={() => setSelectedGame(game)}
            >
              {game.mode === 'bot' ? 'Bot' : 'PVP'} • {game.status}
            </button>
          ))}
          {!games.length && <p className="empty">No active games.</p>}
        </div>
      </section>
    </main>
  )
}
