const firebaseConfig = {
  apiKey: "AIzaSyB0uIxdiHbKPQ_msqIPWDEyyq0KHhUPJVA",
  authDomain: "baraban-15164.firebaseapp.com",
  databaseURL: "https://baraban-15164-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "baraban-15164",
  storageBucket: "baraban-15164.firebasestorage.app",
  messagingSenderId: "836479526930",
  appId: "1:836479526930:web:9312fa9f8e3b5c0d80d0cb",
  measurementId: "G-K615WMWKV8"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

try {
const { createApp, ref, computed, onMounted } = Vue;

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const POSITIONS = { GK: 'Darvozabon', DF: 'Himoyachi', MF: 'Yarim himoyachi', FW: 'Hujumchi' };

const app = createApp({
    setup() {
        const tabs = [
            { id: 'matches', label: "O'yinlar" },
            { id: 'teams', label: 'Jamoalar' },
            { id: 'table', label: 'Jadval' },
            { id: 'stats', label: 'Statistika' },
            { id: 'info', label: 'Nizom' }
        ];
        const facts = [
            { v: '10', l: 'Jamoa' }, { v: '8', l: "O'yinchi" }, { v: '9', l: 'Tur' },
            { v: '45', l: "O'yin" }, { v: '2×25', l: 'Daqiqa' }, { v: '2', l: 'Oy' }
        ];
        const currentTab = ref('matches');
        const tabIndex = computed(() => tabs.findIndex(t => t.id === currentTab.value));

        // Data Storage
        const teams = ref([]);
        const players = ref([]);
        const schedule = ref([]);
        const loaded = ref(false);
        const showSplash = ref(true);

        // Active States
        const activeMatchDetails = ref(null);
        const activeTeamDetails = ref(null);

        // Load Data
        const loadData = () => {
            const started = Date.now();
            db.ref('uniliga').on('value', snap => {
                const data = snap.val() || {};
                teams.value = data.teams || [];
                players.value = data.players || [];
                // Firebase bo'sh massivlarni saqlamaydi — qayta tiklaymiz
                schedule.value = (data.schedule || []).map(r => ({
                    ...r,
                    matches: (r.matches || []).map(m => ({ ...m, events: m.events || [] }))
                }));
                // Ochiq turgan o'yin/jamoa sahifasini yangi ma'lumot bilan yangilaymiz
                if (activeMatchDetails.value) {
                    const id = activeMatchDetails.value.id;
                    let found = null;
                    schedule.value.forEach(r => r.matches.forEach(m => { if (m.id === id) found = m; }));
                    activeMatchDetails.value = found;
                }
                if (activeTeamDetails.value) {
                    activeTeamDetails.value = teams.value.find(t => t.id === activeTeamDetails.value.id) || null;
                }
                if (!loaded.value) {
                    loaded.value = true;
                    // Kirish animatsiyasi kamida 1.4 soniya ko'rinsin
                    setTimeout(() => { showSplash.value = false; }, Math.max(0, 1400 - (Date.now() - started)));
                }
            }, () => { loaded.value = true; showSplash.value = false; });
            // Internet sekin bo'lsa ham kirish ekrani qotib qolmasin
            setTimeout(() => { showSplash.value = false; }, 4000);
        };

        // Helpers
        const getPlayerName = (id) => {
            const p = players.value.find(p => p.id === id);
            return p ? `${p.firstName} ${p.lastName}` : 'Noma\'lum';
        };

        const getPlayer = (id) => {
            return players.value.find(p => p.id === id);
        };

        const getPlayerSafe = (id) => {
            const p = getPlayer(id);
            return p ? p.teamId : '';
        };

        const getTeamName = (id) => {
            const t = teams.value.find(t => t.id === id);
            return t ? t.name : 'Noma\'lum';
        };

        const getTeamColor = (id) => {
            const t = teams.value.find(t => t.id === id);
            return t ? t.color : '#008000';
        };

        const getTeamPlayers = (teamId) => {
            return players.value.filter(p => p.teamId === teamId);
        };

        const formatDate = (d) => {
            if (!d) return '';
            const [y, m, day] = d.split('-').map(Number);
            return `${day}-${MONTHS[m - 1]}`;
        };
        const roundDates = (round) => {
            const ds = [...new Set(round.matches.map(m => m.date))].sort();
            if (!ds.length) return '';
            const a = ds[0], b = ds[ds.length - 1];
            if (a === b) return formatDate(a);
            return a.slice(5, 7) === b.slice(5, 7) ? `${Number(a.slice(8))}–${formatDate(b)}` : `${formatDate(a)} – ${formatDate(b)}`;
        };
        const shortDate = (d) => d ? d.substring(5).split('-').reverse().join('.') : '';
        const eventIcon = (type) => ({ goal: '⚽', yellowCard: '🟨', redCard: '🟥' }[type] || '');
        const positionName = (p) => POSITIONS[p] || p || '';

        // Navigation
        const openMatchDetails = (match) => {
            activeMatchDetails.value = match;
            activeTeamDetails.value = null;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const openTeamDetails = (teamId) => {
            activeTeamDetails.value = teams.value.find(t => t.id === teamId);
            activeMatchDetails.value = null;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        const goBack = () => {
            activeMatchDetails.value = null;
            activeTeamDetails.value = null;
        };

        // Computed: Standings
        const standings = computed(() => {
            const table = {};
            teams.value.forEach(t => {
                table[t.id] = {
                    id: t.id,
                    name: t.name,
                    shortName: t.shortName,
                    color: t.color,
                    played: 0, won: 0, drawn: 0, lost: 0,
                    gf: 0, ga: 0, points: 0
                };
            });

            schedule.value.forEach(round => {
                round.matches.forEach(m => {
                    if (m.status === 'finished' || m.status === 'technical') {
                        const t1 = table[m.team1];
                        const t2 = table[m.team2];
                        if(!t1 || !t2) return;

                        const s1 = Number(m.score1) || 0, s2 = Number(m.score2) || 0;
                        t1.played++; t2.played++;
                        t1.gf += s1; t1.ga += s2;
                        t2.gf += s2; t2.ga += s1;

                        if (s1 > s2) {
                            t1.won++; t1.points += 3;
                            t2.lost++;
                        } else if (s2 > s1) {
                            t2.won++; t2.points += 3;
                            t1.lost++;
                        } else {
                            t1.drawn++; t2.drawn++;
                            t1.points += 1; t2.points += 1;
                        }
                    }
                });
            });

            return Object.values(table).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                const gdA = a.gf - a.ga;
                const gdB = b.gf - b.ga;
                if (gdB !== gdA) return gdB - gdA;
                return b.gf - a.gf;
            });
        });

        const teamRow = (teamId) => {
            const i = standings.value.findIndex(t => t.id === teamId);
            return i === -1 ? null : { ...standings.value[i], place: i + 1 };
        };

        // Computed: Player Stats
        const playerStats = computed(() => {
            const stats = {};
            players.value.forEach(p => {
                stats[p.id] = { id: p.id, teamId: p.teamId, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
            });

            schedule.value.forEach(round => {
                round.matches.forEach(m => {
                    m.events.forEach(e => {
                        if (!stats[e.playerId]) return;

                        if (e.type === 'goal') stats[e.playerId].goals++;
                        if (e.type === 'yellowCard') stats[e.playerId].yellowCards++;
                        if (e.type === 'redCard') stats[e.playerId].redCards++;

                        if (e.type === 'goal' && e.assistPlayerId && stats[e.assistPlayerId]) {
                            stats[e.assistPlayerId].assists++;
                        }
                    });
                });
            });
            return stats;
        });

        const topScorers = computed(() => {
            return Object.values(playerStats.value)
                .filter(s => s.goals > 0)
                .sort((a, b) => b.goals - a.goals)
                .slice(0, 20);
        });

        const topAssists = computed(() => {
            return Object.values(playerStats.value)
                .filter(s => s.assists > 0)
                .sort((a, b) => b.assists - a.assists)
                .slice(0, 20);
        });

        onMounted(() => {
            loadData();
        });

        const reversedSchedule = computed(() => {
            return [...schedule.value].reverse();
        });

        const logoCache = {};
        const getTeamLogo = (color, shortName) => {
            const text = shortName ? shortName.substring(0,3).toUpperCase() : 'FC';
            const c = color || '#008000';
            const key = c + text;
            if (logoCache[key]) return logoCache[key];
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${c};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#000000;stop-opacity:0.7" />
                    </linearGradient>
                </defs>
                <path d="M10 20 L50 5 L90 20 L85 65 C80 85 50 95 50 95 C50 95 20 85 15 65 Z" fill="url(#grad1)" stroke="rgba(255,255,255,0.8)" stroke-width="3"/>
                <path d="M50 5 L90 20 L85 65 C80 85 50 95 50 95 Z" fill="rgba(255,255,255,0.1)"/>
                <text x="50" y="60" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">${text}</text>
            </svg>`;
            return logoCache[key] = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
        };
        const teamLogo = (teamId) => {
            const t = teams.value.find(t => t.id === teamId);
            return t ? getTeamLogo(t.color, t.shortName) : getTeamLogo();
        };

        const currentRound = computed(() => {
            if(!schedule.value || schedule.value.length === 0) return null;
            const round = schedule.value.find(r => r.matches.some(m => m.status === 'pending'));
            return round || schedule.value[schedule.value.length - 1];
        });
        return {
            tabs, facts, currentTab, tabIndex, loaded, showSplash,
            teams, players, schedule, reversedSchedule,
            getPlayerName, getTeamName, getTeamLogo, teamLogo, currentRound, getTeamColor, getPlayer, getPlayerSafe, getTeamPlayers,
            formatDate, shortDate, roundDates, eventIcon, positionName, teamRow,
            activeMatchDetails, activeTeamDetails, openMatchDetails, openTeamDetails, goBack,
            standings, playerStats, topScorers, topAssists
        };
    }
});

app.config.errorHandler = function(err) {
    console.error(err);
};
app.mount('#app');

} catch(e) { document.body.innerHTML = '<div style="padding:20px;color:#fca5a5;background:#000;font-family:sans-serif"><h2>Xatolik!</h2><p>' + e.message + '</p></div>'; }
