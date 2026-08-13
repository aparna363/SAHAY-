// Professional GIS GeoJSON Boundaries for Kerala's 14 Districts
export interface DistrictFeatureProperty {
  district: string;
  DISTRICT: string;
  code: string;
  centerLat: number;
  centerLng: number;
}

export const KERALA_DISTRICTS_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "district": "Kasaragod",
        "DISTRICT": "Kasaragod",
        "code": "KSD",
        "centerLat": 12.51,
        "centerLng": 75.05
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [74.85, 12.78],
            [75.05, 12.74],
            [75.25, 12.65],
            [75.42, 12.55],
            [75.45, 12.38],
            [75.32, 12.22],
            [75.12, 12.18],
            [74.98, 12.32],
            [74.88, 12.52],
            [74.85, 12.78]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Kannur",
        "DISTRICT": "Kannur",
        "code": "KNR",
        "centerLat": 11.95,
        "centerLng": 75.52
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.12, 12.18],
            [75.32, 12.22],
            [75.55, 12.30],
            [75.82, 12.18],
            [75.98, 11.98],
            [75.75, 11.76],
            [75.52, 11.68],
            [75.32, 11.82],
            [75.18, 12.02],
            [75.12, 12.18]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Wayanad",
        "DISTRICT": "Wayanad",
        "code": "WYD",
        "centerLat": 11.75,
        "centerLng": 76.10
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.82, 12.18],
            [76.12, 12.02],
            [76.42, 11.88],
            [76.45, 11.62],
            [76.22, 11.48],
            [75.95, 11.58],
            [75.75, 11.76],
            [75.98, 11.98],
            [75.82, 12.18]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Kozhikode",
        "DISTRICT": "Kozhikode",
        "code": "KKD",
        "centerLat": 11.38,
        "centerLng": 75.85
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.52, 11.68],
            [75.75, 11.76],
            [75.95, 11.58],
            [76.12, 11.42],
            [76.08, 11.22],
            [75.88, 11.12],
            [75.72, 11.22],
            [75.58, 11.45],
            [75.52, 11.68]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Malappuram",
        "DISTRICT": "Malappuram",
        "code": "MLP",
        "centerLat": 11.05,
        "centerLng": 76.15
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.88, 11.12],
            [76.08, 11.22],
            [76.22, 11.48],
            [76.45, 11.42],
            [76.55, 11.22],
            [76.48, 10.92],
            [76.22, 10.74],
            [75.82, 10.78],
            [75.72, 11.02],
            [75.88, 11.12]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Palakkad",
        "DISTRICT": "Palakkad",
        "code": "PKD",
        "centerLat": 10.78,
        "centerLng": 76.60
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.22, 11.48],
            [76.45, 11.42],
            [76.75, 11.25],
            [76.95, 11.05],
            [76.88, 10.62],
            [76.62, 10.38],
            [76.38, 10.58],
            [76.22, 10.74],
            [76.48, 10.92],
            [76.55, 11.22],
            [76.22, 11.48]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Thrissur",
        "DISTRICT": "Thrissur",
        "code": "TCR",
        "centerLat": 10.45,
        "centerLng": 76.22
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [75.82, 10.78],
            [76.22, 10.74],
            [76.38, 10.58],
            [76.62, 10.38],
            [76.68, 10.22],
            [76.38, 10.15],
            [76.15, 10.25],
            [75.92, 10.42],
            [75.82, 10.62],
            [75.82, 10.78]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Ernakulam",
        "DISTRICT": "Ernakulam",
        "code": "EKM",
        "centerLat": 10.05,
        "centerLng": 76.42
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.15, 10.25],
            [76.38, 10.15],
            [76.68, 10.22],
            [76.85, 10.08],
            [76.78, 9.82],
            [76.48, 9.75],
            [76.22, 9.88],
            [76.18, 10.08],
            [76.15, 10.25]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Idukki",
        "DISTRICT": "Idukki",
        "code": "IDK",
        "centerLat": 9.85,
        "centerLng": 76.95
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.68, 10.22],
            [76.88, 10.32],
            [77.42, 10.18],
            [77.35, 9.58],
            [77.02, 9.48],
            [76.78, 9.82],
            [76.85, 10.08],
            [76.68, 10.22]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Kottayam",
        "DISTRICT": "Kottayam",
        "code": "KTM",
        "centerLat": 9.60,
        "centerLng": 76.60
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.48, 9.75],
            [76.78, 9.82],
            [77.02, 9.48],
            [76.75, 9.38],
            [76.48, 9.42],
            [76.38, 9.58],
            [76.48, 9.75]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Alappuzha",
        "DISTRICT": "Alappuzha",
        "code": "ALP",
        "centerLat": 9.42,
        "centerLng": 76.35
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.22, 9.88],
            [76.48, 9.75],
            [76.38, 9.58],
            [76.48, 9.42],
            [76.52, 9.18],
            [76.32, 9.12],
            [76.28, 9.48],
            [76.22, 9.72],
            [76.22, 9.88]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Pathanamthitta",
        "DISTRICT": "Pathanamthitta",
        "code": "PTA",
        "centerLat": 9.25,
        "centerLng": 76.88
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.75, 9.38],
            [77.02, 9.48],
            [77.32, 9.35],
            [77.22, 9.08],
            [76.88, 9.05],
            [76.52, 9.18],
            [76.48, 9.42],
            [76.75, 9.38]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Kollam",
        "DISTRICT": "Kollam",
        "code": "KLM",
        "centerLat": 8.95,
        "centerLng": 76.75
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.32, 9.12],
            [76.52, 9.18],
            [76.88, 9.05],
            [77.28, 8.98],
            [77.18, 8.72],
            [76.72, 8.68],
            [76.52, 8.85],
            [76.32, 9.12]
          ]
        ]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "district": "Thiruvananthapuram",
        "DISTRICT": "Thiruvananthapuram",
        "code": "TVM",
        "centerLat": 8.52,
        "centerLng": 76.95
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [76.72, 8.68],
            [77.18, 8.72],
            [77.38, 8.50],
            [77.15, 8.25],
            [76.82, 8.32],
            [76.92, 8.52],
            [76.72, 8.68]
          ]
        ]
      }
    }
  ]
};
