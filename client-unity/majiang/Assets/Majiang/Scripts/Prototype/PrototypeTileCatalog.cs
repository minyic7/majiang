using UnityEngine;

#if UNITY_EDITOR
using UnityEditor;
#endif

namespace Majiang.Prototype
{
    public static class PrototypeTileCatalog
    {
        public static string GetPath(PrototypeTileId tileId)
        {
            switch (tileId)
            {
                case PrototypeTileId.Bam1: return "Assets/MahjongTiles/Prefabs/Bams/Bam_1.prefab";
                case PrototypeTileId.Bam2: return "Assets/MahjongTiles/Prefabs/Bams/Bam_2.prefab";
                case PrototypeTileId.Bam3: return "Assets/MahjongTiles/Prefabs/Bams/Bam_3.prefab";
                case PrototypeTileId.Bam4: return "Assets/MahjongTiles/Prefabs/Bams/Bam_4.prefab";
                case PrototypeTileId.Bam5: return "Assets/MahjongTiles/Prefabs/Bams/Bam_5.prefab";
                case PrototypeTileId.Bam6: return "Assets/MahjongTiles/Prefabs/Bams/Bam_6.prefab";
                case PrototypeTileId.Bam7: return "Assets/MahjongTiles/Prefabs/Bams/Bam_7.prefab";
                case PrototypeTileId.Bam8: return "Assets/MahjongTiles/Prefabs/Bams/Bam_8.prefab";
                case PrototypeTileId.Bam9: return "Assets/MahjongTiles/Prefabs/Bams/Bam_9.prefab";
                case PrototypeTileId.Crak1: return "Assets/MahjongTiles/Prefabs/Craks/Crak_1.prefab";
                case PrototypeTileId.Crak2: return "Assets/MahjongTiles/Prefabs/Craks/Crak_2.prefab";
                case PrototypeTileId.Crak3: return "Assets/MahjongTiles/Prefabs/Craks/Crak_3.prefab";
                case PrototypeTileId.Crak4: return "Assets/MahjongTiles/Prefabs/Craks/Crak_4.prefab";
                case PrototypeTileId.Crak5: return "Assets/MahjongTiles/Prefabs/Craks/Crak_5.prefab";
                case PrototypeTileId.Crak6: return "Assets/MahjongTiles/Prefabs/Craks/Crak_6.prefab";
                case PrototypeTileId.Crak7: return "Assets/MahjongTiles/Prefabs/Craks/Crak_7.prefab";
                case PrototypeTileId.Crak8: return "Assets/MahjongTiles/Prefabs/Craks/Crak_8.prefab";
                case PrototypeTileId.Crak9: return "Assets/MahjongTiles/Prefabs/Craks/Crak_9.prefab";
                case PrototypeTileId.Dot1: return "Assets/MahjongTiles/Prefabs/Dots/Dot_1.prefab";
                case PrototypeTileId.Dot2: return "Assets/MahjongTiles/Prefabs/Dots/Dot_2.prefab";
                case PrototypeTileId.Dot3: return "Assets/MahjongTiles/Prefabs/Dots/Dot_3.prefab";
                case PrototypeTileId.Dot4: return "Assets/MahjongTiles/Prefabs/Dots/Dot_4.prefab";
                case PrototypeTileId.Dot5: return "Assets/MahjongTiles/Prefabs/Dots/Dot_5.prefab";
                case PrototypeTileId.Dot6: return "Assets/MahjongTiles/Prefabs/Dots/Dot_6.prefab";
                case PrototypeTileId.Dot7: return "Assets/MahjongTiles/Prefabs/Dots/Dot_7.prefab";
                case PrototypeTileId.Dot8: return "Assets/MahjongTiles/Prefabs/Dots/Dot_8.prefab";
                case PrototypeTileId.Dot9: return "Assets/MahjongTiles/Prefabs/Dots/Dot_9.prefab";
                case PrototypeTileId.DragonRed: return "Assets/MahjongTiles/Prefabs/Dragons/Dragon_Red.prefab";
                case PrototypeTileId.DragonGreen: return "Assets/MahjongTiles/Prefabs/Dragons/Dragon_Green.prefab";
                case PrototypeTileId.DragonWhite: return "Assets/MahjongTiles/Prefabs/Dragons/Dragon_White.prefab";
                case PrototypeTileId.WindEast: return "Assets/MahjongTiles/Prefabs/Winds/Wind_East.prefab";
                case PrototypeTileId.WindSouth: return "Assets/MahjongTiles/Prefabs/Winds/Wind_South.prefab";
                case PrototypeTileId.WindWest: return "Assets/MahjongTiles/Prefabs/Winds/Wind_West.prefab";
                case PrototypeTileId.WindNorth: return "Assets/MahjongTiles/Prefabs/Winds/Wind_North.prefab";
                default: return string.Empty;
            }
        }

        public static string GetShortName(PrototypeTileId tileId)
        {
            switch (tileId)
            {
                case PrototypeTileId.Bam1: return "B1";
                case PrototypeTileId.Bam2: return "B2";
                case PrototypeTileId.Bam3: return "B3";
                case PrototypeTileId.Bam4: return "B4";
                case PrototypeTileId.Bam5: return "B5";
                case PrototypeTileId.Bam6: return "B6";
                case PrototypeTileId.Bam7: return "B7";
                case PrototypeTileId.Bam8: return "B8";
                case PrototypeTileId.Bam9: return "B9";
                case PrototypeTileId.Crak1: return "C1";
                case PrototypeTileId.Crak2: return "C2";
                case PrototypeTileId.Crak3: return "C3";
                case PrototypeTileId.Crak4: return "C4";
                case PrototypeTileId.Crak5: return "C5";
                case PrototypeTileId.Crak6: return "C6";
                case PrototypeTileId.Crak7: return "C7";
                case PrototypeTileId.Crak8: return "C8";
                case PrototypeTileId.Crak9: return "C9";
                case PrototypeTileId.Dot1: return "D1";
                case PrototypeTileId.Dot2: return "D2";
                case PrototypeTileId.Dot3: return "D3";
                case PrototypeTileId.Dot4: return "D4";
                case PrototypeTileId.Dot5: return "D5";
                case PrototypeTileId.Dot6: return "D6";
                case PrototypeTileId.Dot7: return "D7";
                case PrototypeTileId.Dot8: return "D8";
                case PrototypeTileId.Dot9: return "D9";
                case PrototypeTileId.DragonRed: return "Red";
                case PrototypeTileId.DragonGreen: return "Green";
                case PrototypeTileId.DragonWhite: return "White";
                case PrototypeTileId.WindEast: return "East";
                case PrototypeTileId.WindSouth: return "South";
                case PrototypeTileId.WindWest: return "West";
                case PrototypeTileId.WindNorth: return "North";
                default: return tileId.ToString();
            }
        }

        public static GameObject LoadPrefab(PrototypeTileId tileId)
        {
#if UNITY_EDITOR
            return AssetDatabase.LoadAssetAtPath<GameObject>(GetPath(tileId));
#else
            Debug.LogWarning("Prototype catalog can only load prefabs inside the Unity editor.");
            return null;
#endif
        }
    }
}
