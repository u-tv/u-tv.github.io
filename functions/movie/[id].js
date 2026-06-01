export async function onRequest(context) {
    const { request, params } = context;
    const movieId = params.id; // URL से मूवी ID निकालेगा (जैसे 12345)

    // TMDB API Key (अगर आपके पास है तो यहाँ डालें, नहीं तो बेसिक सेटअप चालू रहेगा)
    const tmdbApiKey = "YOUR_TMDB_API_KEY_OPTIONAL"; 
    let movieTitle = `Movie ID: ${movieId}`;
    let movieOverview = "Watch high quality streams on U-TV Auto Stream.";
    let moviePoster = `https://image.tmdb.org/t/p/w780/${movieId}.jpg`;

    // 1. बैकएंड पर TMDB से मूवी का असली नाम और डेटा उठाना (SEO के लिए बेस्ट)
    if (tmdbApiKey && tmdbApiKey !== "YOUR_TMDB_API_KEY_OPTIONAL") {
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${tmdbApiKey}&language=hi-IN`);
            if (res.ok) {
                const data = await res.json();
                movieTitle = data.title || data.original_title;
                movieOverview = data.overview || movieOverview;
            }
        } catch (e) {
            console.error("TMDB Fetch Error", e);
        }
    }

    // 2. पूरा HTML रिस्पॉन्स जो Google SEO और यूजर दोनों के लिए परफेक्ट है
    const html = `
    <!DOCTYPE html>
    <html lang="hi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <title>Watch ${movieTitle} Full Movie Online Free - U-TV</title>
        <meta name="description" content="${movieOverview.slice(0, 160)}...">
        <meta name="robots" content="index, follow">
        
        <meta property="og:type" content="video.movie">
        <meta property="og:title" content="Watch ${movieTitle} Online Free">
        <meta property="og:description" content="${movieOverview.slice(0, 150)}">
        <meta property="og:image" content="${moviePoster}">
        
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="Watch ${movieTitle} Online">
        
        <style>
            body { background: #050505; color: #fff; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; text-align: center; }
            .container { max-width: 900px; margin: 20px auto; padding: 15px; }
            h1 { color: red; font-size: 28px; margin-bottom: 5px; text-transform: uppercase; }
            .player-box { background: #000; border: 2px solid #222; border-radius: 12px; aspect-ratio: 16/9; width: 100%; overflow: hidden; box-shadow: 0 0 20px rgba(255,0,0,0.2); margin: 20px 0; }
            iframe { width: 100%; height: 100%; border: none; }
            .details { background: #111; padding: 20px; border-radius: 8px; text-align: left; border: 1px solid #222; }
            .details p { color: #ccc; line-height: 1.6; }
            .back-btn { display: inline-block; margin-top: 15px; color: yellow; text-decoration: none; font-weight: bold; }
            .back-btn:hover { text-decoration: underline; }
        </style>
    </head>
    <body>

        <div class="container">
            <h1>${movieTitle}</h1>
            <p style="color: gray;">U-TV Premium Player</p>

            <div class="player-box">
                <iframe src="https://dood.to/e/${movieId}" allowfullscreen="true" scrolling="no"></iframe>
            </div>

            <div class="details">
                <h3 style="color: red; margin-top: 0;">Storyline / Description</h3>
                <p>${movieOverview}</p>
                <a href="/" class="back-btn">← Back to Home</a>
            </div>
        </div>

    </body>
    </html>
    `;

    return new Response(html, {
        headers: { "content-type": "text/html;charset=UTF-8" },
    });
}
