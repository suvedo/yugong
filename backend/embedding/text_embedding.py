from utils.llm_client import client
from database import agent_op
from utils.log_util import logger


embedding_model = "text-embedding-v4"
embedding_dim   = 2048
        

def embed_text(input_text, model=embedding_model, dimensions=embedding_dim):
    completion = client.embeddings.create(
        model=model,
        input=input_text,
        dimensions=dimensions,# 指定向量维度（仅 text-embedding-v3及 text-embedding-v4支持该参数）
        encoding_format="float"
    )

    return completion.model_dump_json()
 

if __name__ == "__main__":

    import json

    file_path = './data/agent_data/agent_meta_data2'
    embedding_output_file = f'./data/embedding_data/agent_meta_data2.{embedding_model}.{embedding_dim}.embedding_data'

    def test_embedding_with_file():
        with open(file_path, "r", encoding="utf-8") as f, open(embedding_output_file, 'w', encoding='utf-8') as fout:
            data = json.load(f)
            for i, d in enumerate(data):
                d_str = json.dumps(d, ensure_ascii=False)
                d_embeded = embed_text(d_str)

                fout.write(d_embeded)
                fout.write('\n')
                print(f"finish {i+1}th embedding")
                # if i >= 1:
                #     break

    # test_embedding_with_file()

    def insert_embedding2neon():
        with open(file_path, 'r', encoding='utf-8') as f1, open(embedding_output_file, 'r', encoding='utf-8') as f2:
            data = json.load(f1)
            for d, line in zip(data, f2):
                agent_id = d["id"]
                d_str = json.dumps(d, ensure_ascii=False)

                json_obj = json.loads(line.strip())
                e_vec = json_obj["data"][0]["embedding"]

                agent_op.insert(agent_id, e_vec, d_str)

    insert_embedding2neon()

    def test_vec_retrieve():
        with open(embedding_output_file, 'r', encoding='utf-8') as f:
            for line in f:
                json_obj = json.loads(line.strip())
                e_vec = json_obj["data"][0]["embedding"]

                agent_op.vector_retrieve(str(e_vec))

                break

    # test_vec_retrieve()

    def test_vec_retrieve2():
        query = "把我上传的照片转换成吉卜力动漫风"
        d_embeded = embed_text(query)
        d_embeded = json.loads(d_embeded)
        e_vec = d_embeded["data"][0]["embedding"]
        agent_op.vector_retrieve(str(e_vec))

    # test_vec_retrieve2()