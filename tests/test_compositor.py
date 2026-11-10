import sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from PIL import Image,ImageDraw
from magic_cards import render_sprite_sheet

class TestRenderer(unittest.TestCase):
 def test_four_pose_alpha_text_stability(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d); im=Image.new('RGBA',(256,256),(0,0,0,0));paint=ImageDraw.Draw(im)
   for i in range(4):
    x=(i%2)*128;y=(i//2)*128
    paint.ellipse((x+30,y+15,x+100,y+110),fill=(10,60+20*i,225,255))
   src=root/'input.png';im.save(src)
   meta=render_sprite_sheet(src,root/'renders',2,2,'Black Friday','fée à louer -50%',180)
   self.assertEqual(meta['outputs']['apng']['frames'],6)
   self.assertEqual(meta['outputs']['webp']['frames'],6)
   self.assertEqual(meta['outputs']['gif']['frames'],6)
   self.assertGreater(meta['outputs']['gif']['transparent_pct'],1)
   self.assertGreater(meta['outputs']['webp']['alpha_partial_pct'],0)
   anim=Image.open(root/'renders/card.apng')
   anim.seek(0);a=anim.convert('RGBA').crop((0,128,128,200))
   anim.seek(3);b=anim.convert('RGBA').crop((0,128,128,200))
   self.assertEqual(list(a.getdata()),list(b.getdata()),'fixed text banner must be pixel-identical')
 def test_invalid_grid(self):
  with tempfile.TemporaryDirectory() as d:
   inp=Path(d)/'x.png';Image.new('RGBA',(500,800),(0,0,0,0)).save(inp)
   with self.assertRaises(ValueError):render_sprite_sheet(inp,Path(d)/'out',2,3)
 def test_invalid_text(self):
  with tempfile.TemporaryDirectory() as d:
   inp=Path(d)/'x.png';Image.new('RGBA',(256,256),(0,0,0,0)).save(inp)
   with self.assertRaises(ValueError):render_sprite_sheet(inp,Path(d)/'out',2,3,'','subtitle')

if __name__=='__main__':unittest.main()
