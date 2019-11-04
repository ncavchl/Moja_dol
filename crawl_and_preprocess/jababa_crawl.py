from bs4 import BeautifulSoup

from selenium.common.exceptions import NoSuchElementException
from selenium import webdriver
import re
import pandas as pd

from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.exc import IntegrityError

import datetime
import time

PATH = "/root/airflow/dags/chromedriver"
option_ch = webdriver.ChromeOptions()
option_ch.add_argument('--headless')
option_ch.add_argument('--no-sandbox')
option_ch.add_argument('--disable-dev-shm-usage')


engine = create_engine("mysql+pymysql://viewer:"+"moja"+"@localhost/mojadol_DB00?host=localhost?port=3306", encoding='utf-8')
base_url = "https://www.jobaba.net/sprtPlcy/info/list.do?schCl1Cd="
pattern_div_num = re.compile(r'(?<=div id=")[0-9]+')
id_url = "https://www.jobaba.net/sprtPlcy/info/view.do?seq="

pattern_not_t = re.compile(r'[^\t\n]+')

jababa_crawl_origin = """ CREATE TABLE  jababa_crawl_origin(
                            id varchar(100); 
                            title varchar(100),
                            sch varchar(20),
                            target varchar(1000),
                            use varchar(200),
                            category varchar(200),
                            crawl_date timestamp(200),
                            CONSTRAINT youth_origin_pk PRIMARY KEY (id)

);"""
list_category = ['Employment','Life','Residential','ReEmployment','Company']

jababa_id = """
	SELECT id
	FROM jababa_crawl_origin
"""

def youth_id_cral(driver):
    k=0
    res = [[],[],[],[],[]]
    for kda in ['01','04','05','06','07']:
        n=0
        print("id crawl: " + str(k))

        driver.get(base_url + kda)
        while(1):
            try:

                html = driver.page_source
                soup = BeautifulSoup(html, "html.parser")
              
                res[k].extend(pattern_div_num.findall(str(soup.select('#moreListWrap > div'))))

                if n ==0:    
                    test2 = driver.find_element_by_xpath("//div[@id='jobaba_wrap']/form[@id='srchFrm']/div[@id='page-content']/div[@class='container']/div[@class='ct_box left_tp02']/div[@id='content-side']/div[@class='pagination_wrap']/div[@class='mo_paging']/button[1]")
                    n=n+2
                else:
                    if n ==2:
                        time.sleep(1)
                        n=n+1                    
                    test2 = driver.find_element_by_xpath("//div[@id='jobaba_wrap']/form[@id='srchFrm']/div[@id='page-content']/div[@class='container']/div[@class='ct_box left_tp02']/div[@id='content-side']/div[@class='pagination_wrap']/div[@class='mo_paging']/button[2]")

                test2.click()
            except NoSuchElementException as ex:
                print(ex)
                k=k+1
                break
            except Exception as e:
                print(e)
                pass
    
    return res
    

def jababa_content_crawl(soup,url,ind_category):
    row = []
    ## url
    row.append(url)

    ## title
    title = soup.select('.tit')[0].text.replace (u'\xa0',' ')
    row.append(title)

    ##schedule
    sch = soup.select('.sch > dd')[0].text.replace (u'\xa0',' ')
    sch = pattern_not_t.findall(sch)
    sch = ' '.join(sch)
    row.append(sch)

    ##target
    target = soup.select('.target > dd > p')[0].text.replace (u'\xa0',' ')
    row.append(target)

    ## method of use
    use = soup.select('.use > dd ')[0].text.replace (u'\xa0',' ')
    use = pattern_not_t.findall(use)
    use = ' '.join(use)
    row.append(use)

    ## category
    row.append(list_category[ind_category])
    
    
    return row

def jababa_content_crawl_iter(id_list,driver):
    col_list = ['id','title','sch','target','use','category']
    jababa_df = pd.DataFrame(columns = col_list)
    num_df = 0
    ind_category = 0
    
    for idx in id_list:
        print(str(len(idx)))
        for kda in idx:
            try:
                ##print(str(kda))
                driver.get(id_url+str(kda))
                html = driver.page_source
                soup = BeautifulSoup(html, "html.parser")
                jababa_df.loc[num_df]= jababa_content_crawl(soup,str(kda),ind_category)

            except Exception as e:
                print(e)
                jababa_df.loc[num_df] = [str(kda),'err','err','err','err','err']
                pass

            num_df = num_df + 1

        ind_category = ind_category + 1

    return jababa_df

def jababa_crawling():
    
    driver = webdriver.Chrome(PATH,options=option_ch)

    driver.set_window_size(600, 1024)

    id_list = youth_id_cral(driver)
    conn = engine.connect()
    
    id_df = pd.read_sql(jababa_id,con=conn)
    
    pre_id_list = list(id_df['id'])

    for i in range(0,len(id_list)):
        id_list[i] = list(set(id_list[i])-set(pre_id_list))
            

    
    for idx in range(0,5):
        id_list[idx] = list(set(id_list[idx]))

    
    df = jababa_content_crawl_iter(id_list,driver)
    df['crawl_date'] = datetime.datetime.now()

    try:
        
        conn.execute(jababa_crawl_origin)
    except SQLAlchemyError:
        print("exist table")
        pass
    
    print("data row len: "+ str(len(df)))
    for i in range(len(df)):
        try:
            df.iloc[i:i+1].to_sql(name="jababa_crawl_origin",if_exists='append',con=conn,index=False)
        except IntegrityError:
            pass

