// src/components/NewsPanel.tsx
import React, { useState, useEffect } from "react";
import styles from "./NewsPanel.module.css";

// Define the shape of a single news article from the API
interface NewsArticle {
    id: number;
    headline: string;
    summary: string;
    url: string;
    source: string;
    datetime: number; // This will be a Unix timestamp
}

interface NewsPanelProps {
    symbol: string;
}

const NewsPanel: React.FC<NewsPanelProps> = ({ symbol }) => {
    const [news, setNews] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        // Don't fetch if there's no symbol
        if (!symbol) return;

        setIsLoading(true);
        setError("");

        const fetchNews = async () => {
            // Get your Finnhub API key from the environment variables
            const apiKey = import.meta.env.VITE_FINNHUB_API_KEY;
            if (!apiKey) {
                setError("API key for news is not configured.");
                setIsLoading(false);
                return;
            }

            // Dates for the API call (from today to 7 days ago)
            const to = new Date().toISOString().split("T")[0];
            const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0];

            const url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`;

            try {
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error("Failed to fetch news from the network.");
                }
                const data: NewsArticle[] = await response.json();
                // We only want to show the 5 most recent articles
                setNews(data.slice(0, 5));
            } catch (err) {
                console.error("Error fetching news:", err);
                setError("Could not load news articles.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
        // Re-run this effect whenever the symbol changes
    }, [symbol]);

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString("es-ES", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    return (
        <div className={styles.panel}>
            <h3 className={styles.title}>Últimas Noticias sobre {symbol}</h3>
            {isLoading && (
                <p className={styles.loadingText}>Cargando noticias...</p>
            )}
            {error && <p className={styles.errorText}>{error}</p>}
            {!isLoading && !error && news.length === 0 && (
                <p className={styles.emptyText}>
                    No se encontraron noticias recientes.
                </p>
            )}

            <div className={styles.newsList}>
                {news.map((article) => (
                    <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={article.id}
                        className={styles.articleLink}
                    >
                        <p className={styles.headline}>{article.headline}</p>
                        <div className={styles.meta}>
                            <span className={styles.source}>
                                {article.source}
                            </span>
                            <span className={styles.date}>
                                {formatDate(article.datetime)}
                            </span>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default NewsPanel;
