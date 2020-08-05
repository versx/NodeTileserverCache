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
    - `GET /staticmap/:template` (Template Enviroment parsed from URL Parameters. Parameters ending in `json` will be parsed as json. Multiple instances of same Parameter will be parsed as array)
- MutliStaticMap:
    - `POST /multistaticmap` (MultiStaticMap Object in JSON Format as POST body)
    - `GET /multistaticmap/:template` (Template Enviroment parsed from URL Parameters. Parameters ending in `json` will be parsed as json. Multiple instances of same Parameter will be parsed as array)

### Style
Get a list of styles by visiting `/styles`
Checkout https://tileserver.readthedocs.io for a guide on how to add more styles.

### Markers  
StaticMap route accepts an url-ecoded JSON (check bellow) on `markers` query parameter.  
Example:  
```JSON
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
```
{
  "style": string (check avilable styles at /styles),
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
  "polygons": [Geofence]?
}
```

### MultiStaticMap (WIP)
MultiStaticMap route accepts a MultiStaticMap JSON Object as POST Body:
Example:
```
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
```
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
```
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

## Examples

### Tiles
https://tileserverurl/tile/klokantech-basic/{z}/{x}/{y}/2/png

### StaticMap
https://tileserverurl/staticmap?style=klokantech-basic&latitude=47.263416&longitude=11.400512&zoom=17&width=500&height=500&scale=2[?markers=[]&polygons=[]]

### StaticMap with Markers
`POST https://tileserverurl/staticmap`
```JSON
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
```JSON
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
`pokemon.json` file in `Templates` directory (uses [Mustache](https://mustache.github.io) as TemplatingEngine):
```
{
    "style": "klokantech-basic",
    "latitude": {{lat}},
    "longitude": {{lon}},
    "zoom": 15,
    "width": 500,
    "height": 250,
    "scale": 1,
    "markers": [
        {
            "url": "https://rdmurl/static/img/pokemon/{{id}}{{#form}}-{{form}}{{/form}}.png",
            "latitude": {{lat}},
            "longitude": {{lon}},
            "width": 50,
            "height": 50
        }
    ]
}
```
`GET https://tileserverurl/staticmap/pokemon.json?id=201&lat=47.263416&lon=11.400512&form=5`
![staticmap-template response](https://raw.githubusercontent.com/123FLO321/SwiftTileserverCache/master/.exampleimages/staticmaptemplate.png)

## TODO
- Pass through `.env` config to `docker-compose.yml` environment section
- Fix combineImagesGrid  
- Cleanup code  

## Credits  
- [SwiftTileserverCache](https://github.com/123FLO321/SwiftTileserverCache)  
