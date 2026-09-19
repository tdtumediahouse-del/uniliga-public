try { 
const { createApp, ref, computed, onMounted } = Vue;

const app = createApp({
    setup() {
        const currentTab = ref('matches');
        
        // Data Storage
        const teams = ref([]);
        const players = ref([]);
        const schedule = ref([]);

        // Active States
        const activeMatchDetails = ref(null);
        const activeTeamDetails = ref(null);

        // Load Data
        const loadData = () => {
            const t = localStorage.getItem('uniliga_teams');
            const p = localStorage.getItem('uniliga_players');
            const s = localStorage.getItem('uniliga_schedule');
            
            if (t) teams.value = JSON.parse(t);
            if (p) players.value = JSON.parse(p);
            if (s) schedule.value = JSON.parse(s);
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

        // Navigation
        const openMatchDetails = (match) => {
            activeMatchDetails.value = match;
            activeTeamDetails.value = null;
        };

        const openTeamDetails = (teamId) => {
            activeTeamDetails.value = teams.value.find(t => t.id === teamId);
            activeMatchDetails.value = null;
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

                        t1.played++; t2.played++;
                        t1.gf += m.score1; t1.ga += m.score2;
                        t2.gf += m.score2; t2.ga += m.score1;

                        if (m.score1 > m.score2) {
                            t1.won++; t1.points += 3;
                            t2.lost++;
                        } else if (m.score2 > m.score1) {
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

        // Computed: Player Stats
        const playerStats = computed(() => {
            const stats = {};
            players.value.forEach(p => {
                stats[p.id] = { id: p.id, teamId: p.teamId, goals: 0, assists: 0, yellowCards: 0, redCards: 0 };
            });

            schedule.value.forEach(round => {
                round.matches.forEach(m => {
                    if (m.events && m.events.length > 0) {
                        m.events.forEach(e => {
                            if (!stats[e.playerId]) return;
                            
                            if (e.type === 'goal') stats[e.playerId].goals++;
                            if (e.type === 'yellowCard') stats[e.playerId].yellowCards++;
                            if (e.type === 'redCard') stats[e.playerId].redCards++;
                            
                            if (e.type === 'goal' && e.assistPlayerId && stats[e.assistPlayerId]) {
                                stats[e.assistPlayerId].assists++;
                            }
                        });
                    }
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

        return {
            currentTab,
            teams, players, schedule, reversedSchedule,
            getPlayerName, getTeamName, getTeamColor, getPlayer, getPlayerSafe, getTeamPlayers,
            activeMatchDetails, activeTeamDetails, openMatchDetails, openTeamDetails, goBack,
            standings, playerStats, topScorers, topAssists
        };
    }
});

app.config.errorHandler = function(err) {
    document.body.innerHTML = '<div style="padding:20px;color:red;z-index:9999;position:fixed;top:0;left:0;width:100%;height:100%;background:white;font-size:16px;"><h2>Vue Xatoligi!</h2><p>' + err.toString() + '</p><p>Fayl: index.html da xato bor.</p></div>';
};
window.addEventListener('error', function(e) {
    document.body.innerHTML = '<div style="padding:20px;color:red;z-index:9999;position:fixed;top:0;left:0;width:100%;height:100%;background:white;font-size:16px;"><h2>Global JS Xatoligi!</h2><p>' + e.message + '</p></div>';
});
app.mount('#app');

} catch(e) { document.body.innerHTML = '<div style="padding:20px;color:red;z-index:9999;position:fixed;top:0;left:0;width:100%;height:100%;background:white;font-size:16px;"><h2>Asl Xatolik!</h2><p>' + e.stack + '</p></div>'; }
