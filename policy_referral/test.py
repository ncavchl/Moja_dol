import sys
import pandas as pd
from sqlalchemy import create_engine

                                  
uID = sys.argv[1]
limit_num = sys.argv[3]

engine = create_engine("mysql+pymysql://root:"+"page159!"+"@localhost/mojadol_DB00?host=localhost?port=3306", encoding='utf-8')

conn=engine.connect()

def referral(recv_uID, Limit_num, click_weight, mylist_weight, category_weight):
    SQL = "SELECT p_code, " + "(Employment_sup*user.Employment_sup_priority + " +"Startup_sup*user.Startup_sup_priority + " +"Life_welfare*user.Life_welfare_priority + " +"Residential_finance*user.Residential_financial_priority)*" +repr(category_weight) + " " +"AS cg_priority, " +"(Employment_sup*mylist_priority.Employment_sup_priority + " +"Startup_sup*mylist_priority.Startup_sup_priority + " +"Life_welfare*mylist_priority.Life_welfare_priority + " +"Residential_finance*mylist_priority.Residential_financial_priority)*" +repr(mylist_weight) + " " +"AS ml_priority, " +"(Employment_sup*click_priority.Employment_sup_priority + " +"Startup_sup*click_priority.Startup_sup_priority + " +"Life_welfare*click_priority.Life_welfare_priority + " +"Residential_finance*click_priority.Residential_financial_priority)*" + repr(click_weight) + " " +"AS cl_priority " +"FROM policy NATURAL JOIN interest, user, mylist_priority, click_priority " +"WHERE (user.uID = mylist_priority.uID) AND " +"(user.uID = click_priority.uID) AND " +"(mylist_priority.uID = click_priority.uID) AND " +"(user.uID = '" + recv_uID + "') AND " +"((policy.dor = '전국') OR (policy.dor = user.dor AND policy.si = '전체') OR (policy.dor = user.dor AND policy.si = user.si)) " +"ORDER BY (cg_priority + ml_priority + cl_priority) DESC, apply_end ASC " + "LIMIT " + Limit_num
    df = pd.read_sql(SQL, con=conn)
    return df

def user_based_referral(recv_uID, Limit_num):

    age_gap = sys.argv[2]
    SQL = "SELECT p_code, count(*) AS policy_hits " +"FROM user NATURAL JOIN stored_policy, policy " +"WHERE " +"(p_code = s_p_code) AND " +"(age BETWEEN ((SELECT age FROM user WHERE uID = '"+ recv_uID +"') - " + repr(age_gap) + ") AND ((SELECT age FROM user WHERE uID = '"+ recv_uID +"') + " + repr(age_gap) + ")) AND " +"(start_age <= (SELECT age FROM user WHERE uID = '"+ recv_uID +"') AND (SELECT age FROM user WHERE uID = '"+ recv_uID +"') <= end_age) AND " +"((expiration_flag = 2) OR (apply_start <= NOW() AND apply_end >= NOW())) " +"GROUP BY p_code " +"ORDER BY policy_hits DESC " +"LIMIT " + Limit_num
    
    df = pd.read_sql(SQL, con=conn)
    return df


def referral_campare(recv_uID, Limit_num, click_weight, mylist_weight, category_weight):

    age_gap = sys.argv[2]

    referral_SQL = "SELECT p_code, " + "(Employment_sup*user.Employment_sup_priority + " +"Startup_sup*user.Startup_sup_priority + " +"Life_welfare*user.Life_welfare_priority + " +"Residential_finance*user.Residential_financial_priority)*" +repr(category_weight) + " " +"AS cg_priority, " +"(Employment_sup*mylist_priority.Employment_sup_priority + " +"Startup_sup*mylist_priority.Startup_sup_priority + " +"Life_welfare*mylist_priority.Life_welfare_priority + " +"Residential_finance*mylist_priority.Residential_financial_priority)*" +repr(mylist_weight) + " " +"AS ml_priority, " +"(Employment_sup*click_priority.Employment_sup_priority + " +"Startup_sup*click_priority.Startup_sup_priority + " +"Life_welfare*click_priority.Life_welfare_priority + " +"Residential_finance*click_priority.Residential_financial_priority)*" + repr(click_weight) + " " +"AS cl_priority " +"FROM policy NATURAL JOIN interest, user, mylist_priority, click_priority " +"WHERE (user.uID = mylist_priority.uID) AND " +"(user.uID = click_priority.uID) AND " +"(mylist_priority.uID = click_priority.uID) AND " +"(user.uID = '" + recv_uID + "') AND " +"((policy.dor = '전국') OR (policy.dor = user.dor AND policy.si = '전체') OR (policy.dor = user.dor AND policy.si = user.si)) " +"ORDER BY (cg_priority + ml_priority + cl_priority) DESC, apply_end ASC " + "LIMIT " + Limit_num
    user_based_referral_SQL = "SELECT p_code, count(*) AS policy_hits " +"FROM user NATURAL JOIN stored_policy, policy " +"WHERE " +"(p_code = s_p_code) AND " +"(age BETWEEN ((SELECT age FROM user WHERE uID = '"+ recv_uID +"') - " + repr(age_gap) + ") AND ((SELECT age FROM user WHERE uID = '"+ recv_uID +"') + " + repr(age_gap) + ")) AND " +"(start_age <= (SELECT age FROM user WHERE uID = '"+ recv_uID +"') AND (SELECT age FROM user WHERE uID = '"+ recv_uID +"') <= end_age) AND " +"((expiration_flag = 2) OR (apply_start <= NOW() AND apply_end >= NOW())) " +"GROUP BY p_code " +"ORDER BY policy_hits DESC " +"LIMIT " + Limit_num
    
    SQL = "(SELECT p_code FROM (" + referral_SQL + ")) INTERSECT (SELECT p_code FROM (" + user_based_referral_SQL + "))"

    df = pd.read_sql(SQL, con=conn)
    return df

priority_range = 2000
rate = 100
max_match = 0

for clw in range(priority_range):          # 5번 반복. 바깥쪽 루프는 세로 방향
    for mlw in range(priority_range): 
        for cgw in range(priority_range): 
            m_clw = clw/rate + 0.01
            m_mlw = mlw/rate + 0.01
            m_cgw = cgw/rate + 0.01

            # print("m_clw:"+ m_clw + ", m_mlw: " + m_mlw + ", m_cgw: " + m_cgw)
            referral_df = referral_campare(uID, limit_num, m_clw, m_mlw, m_cgw)
            if max_match < len(referral_df):    
                max_match = len(referral_df)
                print("max_match:"+ max_match)



# print("<recommendation for "+ uID +">")
# print(referral_df)
# print()


# print("<user_based_referral for "+ uID +">")
# print(user_based_referral_df)
# print()

