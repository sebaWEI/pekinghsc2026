import pymol
from pymol import cmd

def generate_rna_glb(pdb_file, output_glb):
    # 启动 PyMOL (命令行静默模式，不弹GUI界面)
    pymol.finish_launching(['pymol', '-qc'])
    
    # 1. 导入原始结构
    cmd.load(pdb_file, "raw_rna")
    
    # 2. 先隐藏所有默认显示
    cmd.hide("all")
    
    # 3. 定义你的切片字典 {"前端需要的ID": "残基序号"}
    parts_mapping = {
        "part_splice_site": "resi 1-15",
        "part_guide_region": "resi 16-30",
        "part_stem_loop": "resi 31-45"
    }
    
    # 4. 循环切片并赋予样式
    for part_name, selection in parts_mapping.items():
        # create 命令会克隆选区为一个独立对象，且 100% 锁定原始绝对坐标
        cmd.create(part_name, f"raw_rna and {selection}")
        
        # 设置你想要的显示模式（Cartoon 代表 Ribbon）
        cmd.show("cartoon", part_name)
        
        # 如果需要显示原子球棍，取消下面这行的注释
        # cmd.show("sticks", part_name) 
    
    # 5. 删除原始的完整模型，防止被一起导出
    cmd.delete("raw_rna")
    
    # 6. 导出最终的 glb
    cmd.save(output_glb)
    print(f"✅ 成功导出！包含切分节点的模型已保存为: {output_glb}")
    
    cmd.quit()

# 执行函数 (请替换为你的 pdb 文件路径)
if __name__ == '__main__':
    generate_rna_glb("raw_rna.pdb", "rna_model_final.glb")