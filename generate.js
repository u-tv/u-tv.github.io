<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }} - Watch Free on U-TV</title>
    <style>
        body {
            background-color: #0b0c10;
            color: #c5a059;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .container {
            max-width: 1000px;
            width: 100%;
            background: #1f2833;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        }
        h1 { color: #fff; margin-top: 0; }
        .movie-box {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        .poster {
            width: 200px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.7);
        }
        .details { color: #c5a059; font-size: 16px; line-height: 1.6; }
        .player-wrapper {
            position: relative;
            padding-bottom: 56.25%; /* 16:9 Aspect Ratio */
            height: 0;
            overflow: hidden;
            border-radius: 8px;
            background: #000;
            box-shadow: 0 0 20px rgba(0,0,0,0.8);
        }
        .player-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="movie-box">
        <img class="poster" src="https://image.tmdb.org/t/p/w500{{ poster_path }}" alt="{{ title }} Poster">
        <div class="details">
            <h1>{{ title }}</h1>
            <p><strong>Release Date:</strong> {{ release_date }}</p>
            <p><strong>Rating:</strong> ⭐ {{ vote_average }}/10</p>
            <p><strong>Overview:</strong> {{ overview }}</p>
        </div>
    </div>

    <!-- Video Player Box -->
    <div class="player-wrapper">
        <!-- Doodstream या किसी भी एम्बेड प्लेयर का लिंक यहाँ ऑटोमैटिक सेट होगा -->
        <iframe src="https://dood.li/e/{{ movie_id }}" allowfullscreen scrolling="no"></iframe>
    </div>
</div>

</body>
</html>
