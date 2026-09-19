const { createApp } = Vue;

createApp({
    data() {
        return {
            currentTab: 'table',
            teams: [
                { id: 1, name: 'Lochinlar' },
                { id: 2, name: 'Yuristlar' },
                { id: 3, name: 'Iqtisodchilar' },
                { id: 4, name: 'IT-Fayz' },
                { id: 5, name: 'Tibbiyot' },
                { id: 6, name: 'Pedagoglar' },
                { id: 7, name: 'Bokschi' },
                { id: 8, name: 'Buxgalter' },
                { id: 9, name: 'Filolog' },
                { id: 10, name: 'Arxitektor' }
            ],
            matches: [],
            scorers: []
        }
    },
    computed: {
        totalGoals() {
            return this.matches.reduce((sum, match) => sum + match.score1 + match.score2, 0);
        },
        standings() {
            let table = this.teams.map(t => ({
                id: t.id, name: t.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0
            }));

            this.matches.forEach(m => {
                let t1 = table.find(t => t.id === m.team1);
                let t2 = table.find(t => t.id === m.team2);
                
                if(!t1 || !t2) return;
                
                t1.played++; t2.played++;
                t1.gf += m.score1; t1.ga += m.score2;
                t2.gf += m.score2; t2.ga += m.score1;

                if (m.score1 > m.score2) {
                    t1.won++; t1.points += 3;
                    t2.lost++;
                } else if (m.score1 < m.score2) {
                    t2.won++; t2.points += 3;
                    t1.lost++;
                } else {
                    t1.drawn++; t2.drawn++;
                    t1.points += 1; t2.points += 1;
                }
            });

            return table.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points; 
                if ((b.gf - b.ga) !== (a.gf - a.ga)) return (b.gf - b.ga) - (a.gf - a.ga); 
                return b.gf - a.gf;
            });
        },
        sortedScorers() {
            return [...this.scorers].sort((a, b) => b.goals - a.goals);
        }
    },
    methods: {
        getTeamName(id) {
            let team = this.teams.find(t => t.id === id);
            return team ? team.name : 'Noma\'lum';
        },
        // API dan ma'lumot olish simulyatsiyasi (Hozircha localStorage'dan olamiz)
        // Keyinchalik Netlify'ga qo'yganda buni fetch('api_url') ga almashtiramiz
        async loadData() {
            try {
                let m = localStorage.getItem('eduliga_matches_pro');
                let s = localStorage.getItem('eduliga_scorers_pro');
                if (m) this.matches = JSON.parse(m);
                if (s) this.scorers = JSON.parse(s);
            } catch (error) {
                console.error("Ma'lumotlarni yuklashda xatolik:", error);
            }
        }
    },
    mounted() {
        this.loadData();
        // Har 10 soniyada yangilab turish (API ga ulasak kerak bo'ladi)
        // setInterval(this.loadData, 10000);
    }
}).mount('#app');
