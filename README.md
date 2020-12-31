![Node.js CI](https://github.com/versx/NodeTileserverCache/workflows/Node.js%20CI/badge.svg)
![ts](https://badgen.net/badge/Built%20With/TypeScript/blue)
[![GitHub Release](https://img.shields.io/github/release/versx/NodeTileserverCache.svg)](https://github.com/versx/NodeTileserverCache/releases/)
[![GitHub Contributors](https://img.shields.io/github/contributors/versx/NodeTileserverCache.svg)](https://github.com/versx/NodeTileserverCache/graphs/contributors/)
[![Discord](https://img.shields.io/discord/552003258000998401.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://discord.gg/zZ9h9Xa)  
# NodeTileserverCache

## Installing

**Using Docker**
- Install Docker
- Clone the repository `git clone https://github.com/versx/NodeTileserverCache`  
- Change directory into cloned folder `cp NodeTileserverCache`  
- Create a new folder to store the `.mbtiles` file in and change directories to it: `mkdir TileServer && cd TileServer`  
- Get the download command from https://openmaptiles.com/downloads/ for your region.  
- Download the file using the wget from OpenMapTiles website.  
- Rename downloaded file to end in `.mbtiles` extension if the name is incorrect.  
- Change one folder back into the root NodeTileserverCache project folder where the docker-compose.yml file is located: `cd ..`  
- Copy example.env to .env `cp src/example.env src/.env`
- Fill out `src/.env` environment config (defaults are fine)
- Start and attach to logs: `docker-compose up -d && docker-compose logs -f`  

**Manually**
- Install [tileserver-gl](https://github.com/maptiler/tileserver-gl) either using docker or on the system itself.
- Get Download command from https://openmaptiles.org/downloads/ for your region.
- Download the file using wget.
- Rename file to end in .mbtiles if it got named incorrectly.
- Launch tileserver-gl and provide .mbtiles file in launch parameters.
- Install ImageMagick `sudo apt-get install -y imagemagick && sudo cp /usr/bin/convert /usr/local/bin`
- Clone repository `git clone https://github.com/versx/NodeTileserverCache`
- Change directory to cloned folder `cd NodeTileserverCache`
- Install dependencies, run `npm install`
- Install Typescript, run `sudo npm install -g typescript`
- Copy example.env to .env `cp src/example.env src/.env`
- Fill out `src/.env` environment config (defaults are fine)
- Start `npm run start`

## Formats

- Tiles: 
    - `GET tile/{style}/{z}/{x}/{y}/{scale}/{format}`
- StaticMap: 
    - `GET /static/{style}/{lat}/{lon}/{zoom}/{width}/{height}/{scale}/{format}?markers=[{}]&polygons=[{}]` (StaticMap url query)
    - `POST /staticmap` (StaticMap Object in JSON Format as POST body)
    - `GET /staticmap` (SaticMap Object in URL Parameters. Markers and Polygons need to be URL-encoded)
    - `GET /staticmap/:template` (Template Enviroment parsed from URL Parameters. Parameters ending in `json` will be parsed as json.
    - `GET /staticmap/pregenerated/:id` (Get image from pregenerated map. Use GET or POST to /staticmap with pregenerate=true as URL Parameter to get pregenerate the map)
- MutliStaticMap:
    - `POST /multistaticmap` (MultiStaticMap Object in JSON Format as POST body)
    - `GET /multistaticmap/:template` (Template Enviroment parsed from URL Parameters. Parameters ending in `json` will be parsed as json.
    - `GET /multistaticmap/pregenerated/:id` (Get image from pregenerated map. Use GET or POST to /multistaticmap with pregenerate=true as URL Parameter to get pregenerate the map)

### Style
Get a list of styles by visiting `/styles`
Checkout https://tileserver.readthedocs.io for a guide on how to add more styles.

### Markers  
StaticMap route accepts an url-ecoded JSON (check bellow) on `markers` query parameter.  
Example:  
```json
[
  {
    "url": "Marker Image URL",
    "height": 50,
    "width": 50,
    "x_offset": 0,
    "y_offset": 0,
    "latitude": 10.0,
    "longitude": 10.0
 },
 …
]
```

### StaticMap
StaticMap route accepts a StaticMap Object JSON Object as POST body:
Example:
```json
{
  "style": string (check available styles at /styles),
  "latitude": double,
  "longitude": double,
  "zoom": int,
  "width": int,
  "height": int,
  "scale": int,
  "format": string? (png, jpg, ...),
  "bearing": double?,
  "pitch": double?,
  "markers": [Marker]?,
  "polygons": [Geofence]?,
  "circles": [Circle]?,
  "watermarks": [Watermark]?
}
```

### MultiStaticMap
MultiStaticMap route accepts a MultiStaticMap JSON Object as POST Body:
Example:
```json
{
  "grid": [
    {
      "direction": string (always "First"),
      "maps": [
        {
          "direction": string (always "First"),
          "map": StaticMap
        }, {
          "direction": string ("Right", or "Bottom"),
          "map": StaticMap
        }, 
        ...
      ]
    }, {
      "direction": string ("Right", or "Bottom"),
      "maps": [
        {
          "direction": string (always "First"),
          "map": StaticMap
        }, {
          "direction": string ("Right", or "Bottom"),
          "map": StaticMap
        }, 
        ...
      ]
    },
    ...
  ]
}
```

### Marker
Marker JSON used in StaticMap:
Example:
```json
{
  "url": string,
  "height": int,
  "width": int,
  "x_offset": int,
  "y_offset": int,
  "latitude": double,
  "longitude": double
}
```

### Polygon
Polygon JSON used in StaticMap:
Example:
```json
{
  "fill_color": string (imagemagick color string),
  "stroke_color": string (imagemagick color string),
  "stroke_width": int,
  "path": [
    [double (lat), double (lon)],
    [double, double],
    ...
  ]
}
```

### Circle
Circle JSON used in StaticMap:
Example:
```json
{
  "radius": int,
  "latitude": double,
  "longitude": double,
  "fill_color": string, (imagemagick color string)
  "stroke_color": string, (imagemagick color string)
  "stroke_width": int
}
```

### Watermark
Watermark JSON used in StaticMap:
Example:
```json
{
  "text": string,
  "fill_color": string, (imagemagick color string)
  "size": number,
  "location": string, (imagemagick position keyword)
  "font": string (available font on system)
}
```

## Examples

### Tiles
https://tileserverurl/tile/klokantech-basic/{z}/{x}/{y}/2/png

### StaticMap
https://tileserverurl/staticmap?style=klokantech-basic&latitude=47.263416&longitude=11.400512&zoom=17&width=500&height=500&scale=2&markers=[]&polygons=[]&circles=[]&watermarks=[]

### Pregenerate StaticMap
Pregenerate: `GET https://tileserverurl/staticmap?style=klokantech-basic&latitude=47.263416&longitude=11.400512&zoom=17&width=500&height=500&scale=2&pregenerate=true`  
Returns: `id`  
View: `GET https://tileserverurl/staticmap/pregenerated/{id}`  

### StaticMap with Markers
`POST https://tileserverurl/staticmap`
```json
{
    "style": "klokantech-basic",
    "latitude": 47.263416,
    "longitude": 11.400512,
    "zoom": 17,
    "width": 500,
    "height": 500,
    "scale": 1,
    "markers": [
        {
            "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Map_marker.svg/1200px-Map_marker.svg.png",
            "latitude": 47.263416,
            "longitude": 11.400512,
            "width": 50,
            "height": 50
        }
    ]
}
```
![staticmap response](https://raw.githubusercontent.com/123FLO321/SwiftTileserverCache/master/.exampleimages/staticmap.png)

### MultiStaticMap
`POST https://tileserverurl/multistaticmap`
```json
{
    "grid": [
        {
            "direction": "First",
            "maps": [
                {
                    "direction": "First",
                    "map": {
                        "style": "klokantech-basic",
                        "latitude": 47.263416,
                        "longitude": 11.400512,
                        "zoom": 17,
                        "width": 500,
                        "height": 250,
                        "scale": 1,
                        "markers": [
                            {
                                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Map_marker.svg/1200px-Map_marker.svg.png",
                                "latitude": 47.263416,
                                "longitude": 11.400512,
                                "width": 50,
                                "height": 50
                            }
                        ]
                    }
                }
            ]
        },
        {
            "direction": "Bottom",
            "maps": [
                {
                    "direction": "First",
                    "map": {
                        "style": "klokantech-basic",
                        "latitude": 47.263416,
                        "longitude": 11.400512,
                        "zoom": 15,
                        "width": 300,
                        "height": 100,
                        "scale": 1,
                        "markers": [
                            {
                                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Map_marker.svg/1200px-Map_marker.svg.png",
                                "latitude": 47.263416,
                                "longitude": 11.400512,
                                "width": 25,
                                "height": 25
                            }
                        ]
                    }
                },
                {
                    "direction": "Right",
                    "map": {
                        "style": "klokantech-basic",
                        "latitude": 47.263416,
                        "longitude": 11.400512,
                        "zoom": 12,
                        "width": 200,
                        "height": 100,
                        "scale": 1,
                        "markers": [
                            {
                                "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Map_marker.svg/1200px-Map_marker.svg.png",
                                "latitude": 47.263416,
                                "longitude": 11.400512,
                                "width": 25,
                                "height": 25
                            }
                        ]
                    }
                }
            ]
        }
    ]
}
```
![multistaticmap response](https://raw.githubusercontent.com/123FLO321/SwiftTileserverCache/master/.exampleimages/multistaticmap.png)

### StaticMap using Templates
`pokemon.json` file in `Templates` directory (uses [EJS](https://ejs.co/) as Templating Engine):
```json
{
    "style": "klokantech-basic",
    "latitude": <%= lat %>,
    "longitude": <%= lon %>,
    "zoom": 15,
    "width": 500,
    "height": 250,
    "scale": 1,
    "markers": [{
        "url": "https://raw.githubusercontent.com/Mygod/pokicons/master/v2/<%= id %><% if (form) { %>-f<%= form %><% } %>.png",
        "latitude": <%= lat %>,
        "longitude": <%= lon %>,
        "width": 50,
        "height": 50
    }],
    "circles": [{
        "latitude": <%= lat %>,
        "longitude": <%= lon %>,
        "radius": 25,
        "fill_color": "rgba(100.0%, 100.0%, 100.0%, 0.5)",
        "stroke_color": "rgb(45, 45, 45)",
        "stroke_width": 1
    }],
    "watermarks": [{
        "text": "Testing watermark",
        "fill_color": "rgba(250, 250, 250, 0.3)",
        "stroke_color": "white",
        "stroke_width": 1,
        "size": 14,
        "location": "center",
        "font": "Arial"
    }]
}
```
`GET https://tileserverurl/staticmap/pokemon.json?id=201&lat=47.263416&lon=11.400512&form=5`
![staticmap-template response](https://raw.githubusercontent.com/versx/NodeTileserverCache/watermarks/.github/images/staticmaptemplate.png)

### Complex StaticMap Template (Expected Data Sent)
```json
{
   "lat": 1.0,
   "lon": 1.0,
   "id": 3,
   "form": 0,
   "gyms": [
     { "lat": 1.0, "lon": 1.0, "team": 1 },
     { "lat": 2.0, "lon": 2.0, "team": 3 },
     ...
   ],
   "stops": [
     { "lat": 1.1, "lon": 1.1 },
     { "lat": 2.1, "lon": 2.1 },
     ...
   ]
}
```

## TODO
- Pass through `.env` config to `docker-compose.yml` environment section

## Credits  
- [SwiftTileserverCache](https://github.com/123FLO321/SwiftTileserverCache)  
