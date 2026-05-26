/**
 * News feeds — headlines from trusted sources (Africa + football).
 * Optional: get a free API key at https://rss2json.com and paste it below for better reliability.
 */
const NEWS_CONFIG = {
  rss2jsonKey: "",
  maxHeadlinesPerFeed: 6,
  refreshMinutes: 20,
  showBreakingPopup: true,
  feeds: {
    africa: {
      id: "africa",
      label: "Africa Headlines",
      icon: "🌍",
      description: "Top stories from across the African continent",
      rss: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    },
    football: {
      id: "football",
      label: "Football News",
      icon: "⚽",
      description: "Latest football news from around the world",
      rss: "https://www.theguardian.com/football/rss",
    },
    soccer: {
      id: "soccer",
      label: "Soccer Updates",
      icon: "🏆",
      description: "Soccer headlines and match news",
      rss: "https://www.espn.com/espn/rss/soccer/news",
    },
  },
};
