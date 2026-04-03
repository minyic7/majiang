using System.Collections.Generic;
using UnityEngine;

namespace Majiang.Prototype
{
    public sealed class PrototypeGameController : MonoBehaviour
    {
        [Header("Scene References")]
        public Transform tableRoot;
        public Transform wallRoot;

        [Header("Table")]
        public float planeScale = 0.72f;
        public Color tableColor = new Color(0.16f, 0.44f, 0.32f, 1f);

        [Header("Wall Ratios")]
        public float outerMarginRatio = 0.11f;
        public float stackGapRatio = 0f;
        public float stackOverlapRatio = 0f;
        public float cornerGapRatio = 0.02f;
        public float wallHorizontalScaleMultiplier = 1f;

        private readonly List<GameObject> _spawnedVisuals = new List<GameObject>();

        private float _planeSide;
        private float _tileWidthTarget;
        private float _tileHeightTarget;
        private float _tileDepthTarget;
        private float _tileScale;
        private float _stackGap;
        private float _stackOverlap;
        private float _cornerGap;
        private Vector3 _southWallTileSize;
        private Vector3 _westWallTileSize;
        private Vector3 _wallTileScale;

        private void Start()
        {
            EnsureSceneReferences();
            BuildTableIfMissing();
            CalculateGeometry();
            RenderInitialWalls();
        }

        private void CalculateGeometry()
        {
            _planeSide = planeScale * 10f;

            var blankPrefab = PrototypeTileCatalog.LoadPrefab(PrototypeTileId.DragonBlank);
            if (blankPrefab == null)
            {
                Debug.LogError("Could not load Dragon_Blank prefab.");
                return;
            }

            var sourceBounds = MeasureSourceBounds(blankPrefab);
            var dims = new List<float> { sourceBounds.x, sourceBounds.y, sourceBounds.z };
            dims.Sort();

            var sourceDepth = dims[0];
            var sourceWidth = dims[1];
            var sourceHeight = dims[2];

            var usableRun = _planeSide * (1f - (2f * outerMarginRatio));

            // South and North are the longer sides in this Sichuan setup: 14 stacks.
            _tileWidthTarget = usableRun / (14f + (13f * stackGapRatio));
            _tileHeightTarget = _tileWidthTarget * (28f / 21f);
            _tileDepthTarget = _tileHeightTarget * (16f / 28f);

            _stackGap = _tileWidthTarget * stackGapRatio;
            _stackOverlap = _tileWidthTarget * stackOverlapRatio;
            _cornerGap = _tileWidthTarget * cornerGapRatio;

            var scaleByWidth = _tileWidthTarget / sourceWidth;
            var scaleByHeight = _tileHeightTarget / sourceHeight;
            var scaleByDepth = _tileDepthTarget / sourceDepth;
            _tileScale = Mathf.Min(scaleByWidth, scaleByHeight, scaleByDepth);
            _wallTileScale = new Vector3(
                _tileScale * wallHorizontalScaleMultiplier,
                _tileScale,
                _tileScale * wallHorizontalScaleMultiplier);

            _southWallTileSize = MeasureOrientedTileSize(blankPrefab, Quaternion.Euler(180f, 0f, 0f), _wallTileScale);
            _westWallTileSize = MeasureOrientedTileSize(blankPrefab, Quaternion.Euler(180f, 90f, 0f), _wallTileScale);
        }

        private void RenderInitialWalls()
        {
            ClearSpawnedVisuals();

            const int longSideStacks = 14;
            const int shortSideStacks = 13;

            var longRun = (longSideStacks * _southWallTileSize.x) + ((longSideStacks - 1) * _stackGap);
            var shortRun = (shortSideStacks * _westWallTileSize.z) + ((shortSideStacks - 1) * _stackGap);

            var innerHalfWidth = (shortRun * 0.5f) + _cornerGap;
            var innerHalfLength = (longRun * 0.5f) + _cornerGap;

            var southCenter = new Vector3(0f, 0f, -(innerHalfLength + (_southWallTileSize.z * 0.5f)));
            var northCenter = new Vector3(0f, 0f, innerHalfLength + (_southWallTileSize.z * 0.5f));
            var westCenter = new Vector3(-(innerHalfWidth + (_westWallTileSize.x * 0.5f)), 0f, 0f);
            var eastCenter = new Vector3(innerHalfWidth + (_westWallTileSize.x * 0.5f), 0f, 0f);

            RenderWall(
                "SouthWall",
                longSideStacks,
                southCenter,
                Quaternion.Euler(180f, 0f, 0f),
                false,
                _southWallTileSize);

            RenderWall(
                "NorthWall",
                longSideStacks,
                northCenter,
                Quaternion.Euler(180f, 180f, 0f),
                false,
                _southWallTileSize);

            RenderWall(
                "WestWall",
                shortSideStacks,
                westCenter,
                Quaternion.Euler(180f, 90f, 0f),
                true,
                _westWallTileSize);

            RenderWall(
                "EastWall",
                shortSideStacks,
                eastCenter,
                Quaternion.Euler(180f, -90f, 0f),
                true,
                _westWallTileSize);
        }

        private void RenderWall(
            string wallName,
            int stacks,
            Vector3 center,
            Quaternion rotation,
            bool verticalSeat,
            Vector3 tileSize)
        {
            var root = CreateOrGetChild(wallRoot, wallName);
            var blankPrefab = PrototypeTileCatalog.LoadPrefab(PrototypeTileId.DragonBlank);
            if (blankPrefab == null)
            {
                return;
            }

            var along = verticalSeat ? tileSize.z : tileSize.x;
            var up = tileSize.y;
            var step = Mathf.Max(0.0001f, along + _stackGap - _stackOverlap);
            var totalRun = along + ((stacks - 1) * step);
            var start = -totalRun * 0.5f + (along * 0.5f);

            for (var stackIndex = 0; stackIndex < stacks; stackIndex++)
            {
                for (var level = 0; level < 2; level++)
                {
                    var tile = Instantiate(blankPrefab, root);
                    tile.name = wallName + "_Stack_" + stackIndex + "_Tile_" + level;

                    var offset = start + (stackIndex * step);
                    var position = verticalSeat
                        ? center + new Vector3(0f, (up * 0.5f) + (level * up), offset)
                        : center + new Vector3(offset, (up * 0.5f) + (level * up), 0f);

                    tile.transform.localPosition = position;
                    tile.transform.localRotation = rotation;
                    tile.transform.localScale = _wallTileScale;
                    _spawnedVisuals.Add(tile);
                }
            }
        }

        private Vector3 MeasureSourceBounds(GameObject prefab)
        {
            var sample = Instantiate(prefab);
            sample.hideFlags = HideFlags.HideAndDontSave;
            sample.transform.position = new Vector3(1000f, 1000f, 1000f);
            sample.transform.rotation = Quaternion.identity;
            sample.transform.localScale = Vector3.one;

            var bounds = CollectBounds(sample);
            var size = bounds.size;
            Destroy(sample);
            return size;
        }

        private Vector3 MeasureOrientedTileSize(GameObject prefab, Quaternion rotation, Vector3 scale)
        {
            var sample = Instantiate(prefab);
            sample.hideFlags = HideFlags.HideAndDontSave;
            sample.transform.position = new Vector3(1000f, 1000f, 1000f);
            sample.transform.rotation = rotation;
            sample.transform.localScale = scale;

            var bounds = CollectBounds(sample);
            var size = bounds.size;
            Destroy(sample);
            return size;
        }

        private Bounds CollectBounds(GameObject root)
        {
            var renderers = root.GetComponentsInChildren<Renderer>();
            var bounds = renderers[0].bounds;
            for (var i = 1; i < renderers.Length; i++)
            {
                bounds.Encapsulate(renderers[i].bounds);
            }

            return bounds;
        }

        private Transform CreateOrGetChild(Transform parent, string childName)
        {
            var existing = parent.Find(childName);
            if (existing != null)
            {
                return existing;
            }

            var child = new GameObject(childName).transform;
            child.SetParent(parent, false);
            return child;
        }

        private void ClearSpawnedVisuals()
        {
            foreach (var visual in _spawnedVisuals)
            {
                if (visual != null)
                {
                    Destroy(visual);
                }
            }

            _spawnedVisuals.Clear();

            if (wallRoot == null)
            {
                return;
            }

            for (var i = wallRoot.childCount - 1; i >= 0; i--)
            {
                Destroy(wallRoot.GetChild(i).gameObject);
            }
        }

        private void EnsureSceneReferences()
        {
            if (tableRoot == null) tableRoot = transform.Find("TableRoot");
            if (wallRoot == null) wallRoot = transform.Find("WallRoot");
        }

        private void BuildTableIfMissing()
        {
            if (tableRoot == null)
            {
                tableRoot = new GameObject("TableRoot").transform;
                tableRoot.SetParent(transform, false);
            }

            if (wallRoot == null)
            {
                wallRoot = new GameObject("WallRoot").transform;
                wallRoot.SetParent(transform, false);
            }

            var tablePlane = tableRoot.Find("TablePlane");
            if (tablePlane == null)
            {
                var plane = GameObject.CreatePrimitive(PrimitiveType.Plane);
                plane.name = "TablePlane";
                plane.transform.SetParent(tableRoot, false);
                plane.transform.localPosition = Vector3.zero;
                plane.transform.localRotation = Quaternion.identity;
                plane.transform.localScale = new Vector3(planeScale, 1f, planeScale);

                var renderer = plane.GetComponent<Renderer>();
                renderer.material.color = tableColor;
            }
            else
            {
                tablePlane.localScale = new Vector3(planeScale, 1f, planeScale);
                tablePlane.GetComponent<Renderer>().material.color = tableColor;
            }
        }
    }
}
